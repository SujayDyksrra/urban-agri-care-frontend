"""Leaf image classifier.

This module exposes a single entry point, :func:`predict_leaf`, which the API
calls with the raw bytes of an uploaded image.

It runs the team's trained models from ``models/``, converted from Keras to
TensorFlow Lite so the server only needs the small LiteRT runtime instead of
full TensorFlow (about 100 MB of memory instead of about 750 MB):

* ``disease_classifier.tflite``: MobileNetV2 fine-tuned on 29 leaf classes
  (Chilli, Pepper, Potato, Rice, Tomato). Its output order is given by
  ``disease_class_names.json``.
* ``crop_classifier.tflite``: MobileNetV2 that names the crop (5 classes, order
  in ``crop_names.json``). It is reported as a cross-check in ``details``.

To update a model, retrain in Keras, then run
``python tools/convert_to_tflite.py <model.keras> models/<name>.tflite``.

The model's class names were taken from the training folders and do not match
the keys of ``treatments.json`` (for example ``Tomato_healthy`` versus
``Tomato___healthy``). :data:`MODEL_TO_TREATMENT_LABEL` maps every model class
to its ``treatments.json`` key, so the API keeps returning the labels the app
already understands.

The models are loaded once, on first use, so importing this module stays fast.
"""

import io
import json
import os
import threading
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError

MODELS_DIR = Path(__file__).resolve().parent / "models"
DISEASE_MODEL_FILE = MODELS_DIR / "disease_classifier.tflite"
DISEASE_NAMES_FILE = MODELS_DIR / "disease_class_names.json"
CROP_MODEL_FILE = MODELS_DIR / "crop_classifier.tflite"
CROP_NAMES_FILE = MODELS_DIR / "crop_names.json"

MODEL_VERSION = "mobilenetv2-finetuned-29class-v1"

# Both models take 224x224 RGB input.
INPUT_SIZE = (224, 224)

# How pixels are scaled before inference. The saved models contain no
# Rescaling layer, so this must match what the training notebook did:
#   "mobilenet_v2": x / 127.5 - 1  (tf.keras.applications.mobilenet_v2.preprocess_input)
#   "unit":         x / 255
#   "raw":          x unchanged (0..255)
PREPROCESSING = os.environ.get("MODEL_PREPROCESSING", "mobilenet_v2")

# Set LOAD_CROP_MODEL=0 to skip the crop model.
LOAD_CROP_MODEL = os.environ.get("LOAD_CROP_MODEL", "1") != "0"

# Model class name -> treatments.json key.
MODEL_TO_TREATMENT_LABEL = {
    "Bacterial Leaf Blight": "Rice___Bacterial_Leaf_Blight",
    "Brown Spot": "Rice___Brown_Spot",
    "Chilli __Whitefly": "Chilli___Whitefly",
    "Chilli __Yellowish": "Chilli___Yellowish",
    "Chilli__Anthracnos": "Chilli___Anthracnose",
    "Chilli__Damping_Off": "Chilli___Damping_Off",
    "Chilli__Leaf_Curl_Virus": "Chilli___Leaf_Curl_Virus",
    "Chilli__Leaf_Spot": "Chilli___Leaf_Spot",
    "Chilli__Veinal_Mottle_Virus": "Chilli___Veinal_Mottle_Virus",
    "Chilli___healthy": "Chilli___healthy",
    "Healthy Rice Leaf": "Rice___healthy",
    "Leaf Blast": "Rice___Leaf_Blast",
    "Leaf scald": "Rice___Leaf_scald",
    "Pepper__bell___Bacterial_spot": "Pepper,_bell___Bacterial_spot",
    "Pepper__bell___healthy": "Pepper,_bell___healthy",
    "Potato___Early_blight": "Potato___Early_blight",
    "Potato___Late_blight": "Potato___Late_blight",
    "Potato___healthy": "Potato___healthy",
    "Sheath Blight": "Rice___Sheath_Blight",
    "Tomato_Bacterial_spot": "Tomato___Bacterial_spot",
    "Tomato_Early_blight": "Tomato___Early_blight",
    "Tomato_Late_blight": "Tomato___Late_blight",
    "Tomato_Leaf_Mold": "Tomato___Leaf_Mold",
    "Tomato_Septoria_leaf_spot": "Tomato___Septoria_leaf_spot",
    "Tomato_Spider_mites_Two_spotted_spider_mite": (
        "Tomato___Spider_mites Two-spotted_spider_mite"
    ),
    "Tomato__Target_Spot": "Tomato___Target_Spot",
    "Tomato__Tomato_YellowLeaf__Curl_Virus": (
        "Tomato___Tomato_Yellow_Leaf_Curl_Virus"
    ),
    "Tomato__Tomato_mosaic_virus": "Tomato___Tomato_mosaic_virus",
    "Tomato_healthy": "Tomato___healthy",
}

TOP_K = 3


class LowQualityImageError(ValueError):
    """Raised when an uploaded image cannot be read or classified."""


class _TfliteModel:
    """One LiteRT interpreter; calls are serialised because it is not thread-safe."""

    def __init__(self, path):
        from ai_edge_litert.interpreter import Interpreter

        self._interpreter = Interpreter(model_path=str(path), num_threads=1)
        self._interpreter.allocate_tensors()
        self._input = self._interpreter.get_input_details()[0]["index"]
        output = self._interpreter.get_output_details()[0]
        self._output = output["index"]
        self.num_classes = int(output["shape"][-1])
        self._lock = threading.Lock()

    def __call__(self, batch):
        with self._lock:
            self._interpreter.set_tensor(self._input, batch)
            self._interpreter.invoke()
            return self._interpreter.get_tensor(self._output)[0].copy()


_lock = threading.Lock()
_state = {}


def _read_names(path):
    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


def _load_models():
    """Load the models once and cache them for later requests."""
    if _state:
        return _state

    with _lock:
        if _state:
            return _state

        disease_names = _read_names(DISEASE_NAMES_FILE)
        unmapped = [n for n in disease_names if n not in MODEL_TO_TREATMENT_LABEL]
        if unmapped:
            raise RuntimeError(f"No treatments.json label for classes: {unmapped}")

        disease_model = _TfliteModel(DISEASE_MODEL_FILE)
        if disease_model.num_classes != len(disease_names):
            raise RuntimeError("Disease model output size does not match its class names.")

        crop_model = crop_names = None
        if LOAD_CROP_MODEL and CROP_MODEL_FILE.exists():
            crop_names = _read_names(CROP_NAMES_FILE)
            crop_model = _TfliteModel(CROP_MODEL_FILE)

        _state.update(
            disease_model=disease_model,
            disease_names=disease_names,
            crop_model=crop_model,
            crop_names=crop_names,
        )
        return _state


def warm_up():
    """Load the models and run one dummy prediction (optional, at startup)."""
    state = _load_models()
    dummy = np.zeros((1, *INPUT_SIZE, 3), dtype=np.float32)
    state["disease_model"](dummy)
    if state["crop_model"] is not None:
        state["crop_model"](dummy)


def _preprocess(image_bytes):
    try:
        with Image.open(io.BytesIO(image_bytes)) as image:
            image = ImageOps.exif_transpose(image)  # Respect phone rotation.
            rgb = image.convert("RGB").resize(INPUT_SIZE, Image.BILINEAR)
    except (UnidentifiedImageError, OSError) as error:
        raise LowQualityImageError(
            "The uploaded file is not a readable image."
        ) from error

    pixels = np.asarray(rgb, dtype=np.float32)
    if PREPROCESSING == "mobilenet_v2":
        pixels = pixels / 127.5 - 1.0
    elif PREPROCESSING == "unit":
        pixels = pixels / 255.0
    return pixels[np.newaxis, ...].astype(np.float32)


def _crop_of(label):
    return label.split("___", 1)[0].replace(",_bell", "")


def predict_leaf(image_bytes):
    """Classify a leaf image with the trained model.

    Args:
        image_bytes: Raw bytes of a JPEG, PNG or WebP image.

    Returns:
        A dict with ``label`` (a key in ``treatments.json``), ``confidence``
        between 0 and 1, ``model_version`` and ``details`` (top predictions
        and the crop model's opinion).

    Raises:
        LowQualityImageError: If the image is empty or unreadable.
    """
    if not image_bytes:
        raise LowQualityImageError("The uploaded image is empty.")

    batch = _preprocess(image_bytes)
    state = _load_models()

    probs = state["disease_model"](batch)
    order = np.argsort(probs)[::-1]
    names = state["disease_names"]

    top = [
        {
            "label": MODEL_TO_TREATMENT_LABEL[names[i]],
            "confidence": round(float(probs[i]), 4),
        }
        for i in order[:TOP_K]
    ]
    best = top[0]
    details = {"method": "tflite-mobilenetv2", "top_predictions": top}

    if state["crop_model"] is not None:
        crop_probs = state["crop_model"](batch)
        crop_index = int(np.argmax(crop_probs))
        crop = state["crop_names"][crop_index]
        details["crop"] = {
            "label": crop,
            "confidence": round(float(crop_probs[crop_index]), 4),
            "agrees_with_disease_model": crop == _crop_of(best["label"]),
        }

    return {
        "label": best["label"],
        "confidence": min(max(best["confidence"], 0.0), 1.0),
        "model_version": MODEL_VERSION,
        "details": details,
    }
