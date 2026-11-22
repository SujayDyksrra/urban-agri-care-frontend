"""Convert a trained Keras model to TensorFlow Lite for the backend.

Needs full TensorFlow (pip install tensorflow keras==3.15.1), only on the
machine doing the conversion, not on the server.

Usage: python tools/convert_to_tflite.py model.keras models/name.tflite
"""
import sys, os
os.environ["TF_CPP_MIN_LOG_LEVEL"]="3"
import keras, tensorflow as tf, numpy as np
src, dst = sys.argv[1], sys.argv[2]
m = keras.models.load_model(src, compile=False)
# Inference-only graph: skip augmentation layers explicitly.
inp = keras.Input((224,224,3)); x = inp
for l in m.layers[1:]:
    if l.__class__.__name__ in ("RandomFlip","RandomRotation"): continue
    x = l(x, training=False)
inf = keras.Model(inp, x)
t = np.random.default_rng(0).uniform(-1,1,(4,224,224,3)).astype("float32")
print("augment-skip diff", float(np.abs(inf(t)-m(t,training=False)).max()))
conv = tf.lite.TFLiteConverter.from_keras_model(inf)
open(dst,"wb").write(conv.convert())
it = tf.lite.Interpreter(model_path=dst); it.allocate_tensors()
i,o = it.get_input_details()[0], it.get_output_details()[0]
mx=0
for k in range(4):
    it.set_tensor(i["index"], t[k:k+1]); it.invoke(); mx=max(mx,float(np.abs(it.get_tensor(o["index"])-m(t[k:k+1],training=False)).max()))
print(os.path.basename(dst), os.path.getsize(dst)//1024, "KB  max diff vs keras", mx)
