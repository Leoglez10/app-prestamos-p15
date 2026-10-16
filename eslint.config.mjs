// Lint acotado a proposito: solo las Rules of Hooks.
//
// Existe por el bug del Kiosko de la v0.5.0 a la v0.7.1. `usePistola` quedo
// debajo de dos `return` tempranos, el numero de hooks cambio entre renders y
// React aborto con "Rendered more hooks than during the previous render". La
// ventana quedaba en blanco, sin consola en un build de escritorio y sin nada
// que apuntara al archivo. `rules-of-hooks` lo marca en el editor.
//
// ponytail: no se agregan reglas de estilo ni el preset de typescript-eslint.
// Un preset completo sobre este codigo saca cientos de avisos que nadie va a
// leer, y un lint que nadie lee no protege nada. Si algun dia hace falta mas,
// se agrega la regla puntual que haga falta.
import reactHooks from "eslint-plugin-react-hooks";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { "react-hooks": reactHooks },
    rules: {
      // El bug del Kiosko. Nunca en warn: rompe la pantalla entera.
      "react-hooks/rules-of-hooks": "error",
      // En warn a proposito: hay efectos que dependen de menos cosas de las que
      // leen y arreglarlos todos de golpe cambiaria comportamiento.
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];
