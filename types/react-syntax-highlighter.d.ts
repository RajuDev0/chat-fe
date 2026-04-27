declare module "react-syntax-highlighter" {
  type ComponentType<P = Record<string, unknown>> = import("react").ComponentType<P>;

  export const PrismAsyncLight: ComponentType & {
    registerLanguage: (name: string, language: unknown) => void;
  };
}

declare module "react-syntax-highlighter/dist/esm/languages/prism/*" {
  const language: unknown;
  export default language;
}

declare module "react-syntax-highlighter/dist/cjs/styles/prism" {
  export const coldarkDark: unknown;
}
