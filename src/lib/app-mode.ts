export const APP_MODE = process.env.APP_MODE || ""
export const IS_FREE_MODE = APP_MODE === "" || APP_MODE === "selfhost"
export const IS_PAID_MODE = APP_MODE === "paid"
