export function installContextMenuSuppressor(target: EventTarget): () => void {
  const onContextMenu = (event: Event) => {
    event.preventDefault();
  };
  target.addEventListener("contextmenu", onContextMenu);
  return () => target.removeEventListener("contextmenu", onContextMenu);
}
