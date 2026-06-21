import "react";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "paypal-button": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          type?: "pay" | "checkout" | "buynow" | "subscribe";
          hidden?: boolean;
        },
        HTMLElement
      >;
    }
  }
}
