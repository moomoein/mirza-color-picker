# Mirza Color Picker 🎨

A lightweight, dependency-free, and professional color picker for the modern web.

## Features
- 🌓 **Dark & Light Themes**
- 📐 **Horizontal & Vertical (Studio) Layouts**
- 🌍 **RTL Support (Persian/Arabic)**
- 🎨 **HEX, RGB, HSL Support**
- 📱 **Mobile Friendly & Responsive**
- ⚡ **Zero Dependencies**

## Installation

Simply include the CSS and JS files:

```html
<link rel="stylesheet" href="mirza.css">
<script src="mirza.js"></script>
```

## Usage

```javascript
new MirzaColorPicker({
  trigger: '#myButton',
  theme: 'dark',       // 'dark' | 'light'
  layout: 'default',   // 'default' | 'vertical'
  lang: 'en',          // 'en' | 'fa'
  defaultColor: '#7c5cff',
  onChange: (color) => {
    console.log('Selected color:', color);
  }
});
```

## License
MIT
```