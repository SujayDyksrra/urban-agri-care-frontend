import { Linking, StyleSheet, Text } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { font, theme, type, lineHeight } from '../theme';

export default function GuidanceMarkdown({ markdown }: { markdown: string }) {
  if (!markdown.trim()) return <Text style={styles.body}>No guidance text was returned.</Text>;
  return <Markdown
    style={{ body: styles.body, heading1: styles.h1, heading2: styles.h2, heading3: styles.h3, strong: styles.strong, bullet_list: styles.list, ordered_list: styles.list, paragraph: styles.paragraph, link: styles.link }}
    rules={{ image: () => null, html_inline: () => null, html_block: () => null }}
    onLinkPress={(url) => { if (/^https?:\/\//i.test(url)) void Linking.openURL(url); return false; }}
  >{markdown}</Markdown>;
}
const styles = StyleSheet.create({
  body: { color: theme.text, fontFamily: font.regular, fontSize: type.body, lineHeight: lineHeight(type.body), flexShrink: 1 },
  h1: { color: theme.primaryDark, fontFamily: font.bold, letterSpacing: -0.3, fontSize: type.title, lineHeight: lineHeight(type.title), marginTop: 12, marginBottom: 9 },
  h2: { color: theme.primaryDark, fontFamily: font.bold, letterSpacing: -0.3, fontSize: type.title, lineHeight: lineHeight(type.title), marginTop: 12, marginBottom: 7 },
  h3: { color: theme.text, fontSize: type.title, lineHeight: lineHeight(type.title), fontFamily: font.semibold, marginTop: 10 },
  strong: { fontFamily: font.semibold }, list: { marginTop: 5, marginBottom: 10 }, paragraph: { marginBottom: 10 },
  link: { color: theme.primary, textDecorationLine: 'underline' },
});
