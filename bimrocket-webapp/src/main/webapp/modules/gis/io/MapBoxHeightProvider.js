/**
 * MapBoxHeightProvider.js
 *
 * @author nexus, realor
 */

import { MapBoxProvider } from "../lib/geo-three.module.js";

class MapBoxHeightProvider extends MapBoxProvider
{
  constructor(apiToken = '', id = 'mapbox.terrain-rgb',
    mode = MapBoxProvider.MAP_ID, format = 'pngraw',
    useHDPI = false, version = 'v4')
  {
    super(apiToken, id, mode, format, useHDPI,version);
  }
}

export { MapBoxHeightProvider };


