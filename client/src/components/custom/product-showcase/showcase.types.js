/**
 * @typedef {Object} ShowcaseXY
 * @property {number} x  Horizontal offset from centre, in % of the stage width.
 * @property {number} y  Vertical offset from centre, in % of the stage height.
 */

/**
 * @typedef {Object} ShowcaseProductConfig
 * @property {string} productId              Links to a real product (_id or slug).
 * @property {string} [image]                Optional transparent-PNG override.
 * @property {number} order                  Sequence in the scroll timeline.
 * @property {"left"|"right"|"top"|"bottom"|"zoom"} animation  Entrance direction.
 * @property {number} [scale]                Resting scale (default 1).
 * @property {number} [rotation]             Resting rotation in degrees.
 * @property {ShowcaseXY} desktop            Resting position on desktop.
 * @property {ShowcaseXY} mobile             Resting position on mobile.
 */

/**
 * @typedef {Object} ShowcaseConfig
 * @property {boolean} enabled
 * @property {string} bgImage
 * @property {string} bgVideo
 * @property {string} heading
 * @property {string} subtitle
 * @property {string} ctaText
 * @property {string} ctaUrl
 * @property {number} overlay        0..1 dark overlay opacity.
 * @property {number} bgZoom         Target background scale (1..2).
 * @property {number} scrollLength   Pinned scroll distance in px.
 * @property {ShowcaseProductConfig[]} products
 */

/**
 * @typedef {ShowcaseProductConfig & { product: any }} ResolvedShowcaseProduct
 */

export {};
