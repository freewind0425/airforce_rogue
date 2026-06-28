export class AssetLoader {
  constructor(manifestUrl) {
    this.manifestUrl = manifestUrl;
    this.manifest = null;
    this.images = new Map();
  }

  async load() {
    const res = await fetch(this.manifestUrl);
    if (!res.ok) throw new Error(`Manifest load failed: ${this.manifestUrl}`);
    this.manifest = await res.json();

    const paths = this.collectPaths(this.manifest.assets);
    await Promise.all(paths.map((path) => this.loadImage(path)));
    return this;
  }

  collectPaths(node, out = []) {
    if (typeof node === 'string') {
      out.push(node);
    } else if (Array.isArray(node)) {
      node.forEach((v) => this.collectPaths(v, out));
    } else if (node && typeof node === 'object') {
      Object.values(node).forEach((v) => this.collectPaths(v, out));
    }
    return [...new Set(out)];
  }

  loadImage(path) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        this.images.set(path, img);
        resolve(img);
      };
      img.onerror = () => {
        console.warn('[AssetLoader] missing image, fallback will be used:', path);
        resolve(null);
      };
      img.src = path;
    });
  }

  get(path) {
    return this.images.get(path) || null;
  }

  getByPath(path) {
    return this.get(path);
  }
}
