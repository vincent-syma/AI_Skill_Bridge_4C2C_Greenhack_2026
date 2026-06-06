# AI Skill Bridge runnable prototype

This package contains the runnable app shell. The old wireframe files and the old Tasks/Coalition pages were removed.

## Translation support

Visible UI copy is now routed through the app translation layer in `applib.jsx` and is available in:

- English (`en`)
- Czech (`cs`)
- German (`de`)
- Ukrainian (`uk`)

The language switcher is available on the sign-in screen, in the top bar, and in Settings. Project titles, project objectives, modal text, peer evaluation copy, scheduler labels, toast messages, showcase cards, and auth-page text are now localized instead of being hard-coded directly in the JSX.

## Run

From this folder:

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:8042
```

The prototype uses React and Babel from CDN, so the browser needs internet access.
