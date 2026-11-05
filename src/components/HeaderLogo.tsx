import { Image } from 'expo-image';

const logo = require('../../assets/header-logo.png'); // 198×120

/** FL brand logo used as the header title on the main tabs. */
export function HeaderLogo() {
  return <Image source={logo} style={{ width: 53, height: 32 }} contentFit="contain" accessibilityLabel="Football Live" />;
}
