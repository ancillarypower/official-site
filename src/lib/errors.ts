/**
 * Application error with an i18n-compatible error code.
 *
 * Throw an AppError instead of a plain Error when the message may be
 * displayed to the user. The `code` maps to a key in the i18n
 * translation files; the `fallback` message (stored in Error.message)
 * serves as a developer-readable English default and keeps existing
 * `err.message` assertions backward-compatible.
 *
 * Optional `params` carry dynamic values for interpolation in the
 * translated string (e.g. `{details}`, `{names}`).
 *
 * @example
 * throw new AppError("error_price_changed", "Price changed", { details: "Widget: 10 → 15" });
 * // catch handler: t(err.code).replaceAll("{details}", err.params.details)
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    fallback: string,
    public readonly params?: Record<string, string>,
  ) {
    super(fallback);
    this.name = "AppError";
  }
}

/**
 * AppError raised after WooCommerce has already created the order
 * (POST /orders returned 2xx) but a follow-up step failed, e.g. the
 * response body could not be parsed or validated.
 *
 * Callers must check `instanceof OrderCreatedError` rather than
 * matching `code`: the order-created fact is carried by the type, so
 * reusing an error code for a failure before the POST can never clear
 * the cart by accident (#582).
 */
export class OrderCreatedError extends AppError {
  constructor(code: string, fallback: string, params?: Record<string, string>) {
    super(code, fallback, params);
    this.name = "OrderCreatedError";
  }
}
