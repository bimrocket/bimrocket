/**
 * WMSProvider.js
 *
 * @author nexus, realor
 */

import { MapProvider } from "geo-three";

// world BBOX
const ORIGIN_X = -20037508.342789244;
const ORIGIN_Y = 20037508.342789244;
const WORLD_W = 20037508.342789244 * 2;
const SRS = "EPSG:3857";

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

class WMSProvider extends MapProvider
{
  constructor(baseUrl = "", layers = "", format = "image/png", transparent = true)
  {
    super();
    this.baseUrl = baseUrl;
    this.layers = layers;
    this.format = format;
    this.transparent = transparent;
    this.tileSize = 256;
    this.minZoom = 0;
    this.maxZoom = 19;
    this.bounds = [];
  }

  fetchTile(zoom, x, y)
  {
    try
    {
      if (zoom < this.minZoom || zoom > this.maxZoom)
      {
        throw new Error(`Zoom ${zoom} out of range`);
      }

      const [minx, miny, maxx, maxy] = extent3857(zoom, x, y);

      if (this.bounds?.length === 4)
      {
        const [bx0, by0, bx1, by1] = this.bounds;
        if (maxx < bx0 || maxy < by0 || minx > bx1 || miny > by1)
        {
          return new Promise((resolve) =>
          {
            // return empty image if out of bounds
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
      url.searchParams.set("SRS", SRS);
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
        };
        img.onerror = (err) => reject(err);
        img.src = url.toString();
      });
    }
    catch (err)
    {
      return Promise.reject(err);
    }
  }
}

export { WMSProvider };


