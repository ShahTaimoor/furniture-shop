export function flyToCart(imgRef, cartRef) {
  if (!imgRef?.current || !cartRef?.current) {
    console.error("Missing refs for flyToCart animation");
    return;
  }

  const img = imgRef.current;
  const cart = cartRef.current;

  const imgRect = img.getBoundingClientRect();
  const cartRect = cart.getBoundingClientRect();

  const flyingImg = img.cloneNode(true);

  Object.assign(flyingImg.style, {
    position: "fixed",
    top: `${imgRect.top}px`,
    left: `${imgRect.left}px`,
    width: `${imgRect.width}px`,
    height: `${imgRect.height}px`,
    zIndex: "9999",
    transition: "all 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
    pointerEvents: "none",
    objectFit: "cover",
    borderRadius: "0",
    transform: "translate(0, 0)",
    opacity: "1"
  });

  document.body.appendChild(flyingImg);

  // Force reflow
  flyingImg.getBoundingClientRect();

  // Animate to cart (no scroll offsets)
  requestAnimationFrame(() => {
    Object.assign(flyingImg.style, {
      top: `${cartRect.top}px`,
      left: `${cartRect.left}px`,
      width: "24px",
      height: "24px",
      opacity: "0.5",
      transform: "scale(0.5) rotate(15deg)"
    });
  });

  // Cleanup
  setTimeout(() => {
    flyingImg.remove();
  }, 800);
}
