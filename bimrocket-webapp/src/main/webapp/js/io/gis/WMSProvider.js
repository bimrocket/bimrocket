/**
 * WMSProvider.js
 *
 * @author nexus
 */

import { MapProvider } from "geo-three";

//BBOX del mon
const ORIGIN_X = -20037508.342789244;
const ORIGIN_Y = 20037508.342789244;
const WORLD_W = 20037508.342789244 * 2;

function extent3857(z, x, y)
{
  const dim = 2 ** z;
  const size = WORLD_W / dim;
  const minX = ORIGIN_X + x * size;
  const maxX = minX + size;
  const minY = ORIGIN_Y - (y + 1) * size;
  const maxY = minY + size;
  return [minX, minY, maxX, maxY];
}

export class WMSProvider extends MapProvider
{
  constructor(baseUrl, layers, crs, format = "image/png", transparent = true, onTileLoaded = null)
  {
    super();
    this.baseUrl = baseUrl;
    this.layers = layers;
    this.crs = crs;
    this.format = format;
    this.transparent = transparent;
    this.onTileLoaded = onTileLoaded;
    this.tileSize = 256;
    this.minZoom = 0;
    this.maxZoom = 19;
    this.bounds = [];
  }

  fetchTile(zoom, x, y)
  {
    if (zoom < this.minZoom || zoom > this.maxZoom)
    {
      return Promise.reject(new Error(`Zoom ${zoom} fora de rang`));
    }

    const [minx, miny, maxx, maxy] = extent3857(zoom, x, y);

    if (this.bounds?.length === 4)
    {
      const [bx0, by0, bx1, by1] = this.bounds;
      if (maxx < bx0 || maxy < by0 || minx > bx1 || miny > by1)
      {
        return new Promise((resolve) =>
        {
          const c = document.createElement("canvas");
          c.width = c.height = this.tileSize;
          const img = new Image();
          img.onload = () => resolve(img);
          img.src = c.toDataURL("image/png");
        });
      }
    }

    const url = new URL(this.baseUrl);
    url.searchParams.set("SERVICE", "WMS");
    url.searchParams.set("VERSION", "1.1.1");
    url.searchParams.set("REQUEST", "GetMap");
    url.searchParams.set("LAYERS", this.layers);
    url.searchParams.set("STYLES", "");
    url.searchParams.set("SRS", this.crs);
    url.searchParams.set("BBOX", `${minx},${miny},${maxx},${maxy}`);
    url.searchParams.set("WIDTH", this.tileSize);
    url.searchParams.set("HEIGHT", this.tileSize);
    url.searchParams.set("FORMAT", this.format);
    url.searchParams.set("TRANSPARENT", String(this.transparent));
    //url.searchParams.set("BGCOLOR", "0000ff");

    return new Promise((resolve, reject) =>
    {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        resolve(img);
        if (this.onTileLoaded) this.onTileLoaded();
      };
      img.onerror = (err) => reject(err);
      img.src = url.toString();
    });
  }
}
