/**
 * ASCIIGridLoader.js
 *
 * @author realor
 */
import { ObjectBuilder } from "../../builders/ObjectBuilder.js";
import { Solid } from "../../core/Solid.js";
import { SolidGeometry } from "../../core/SolidGeometry.js";
import { WebUtils } from "../../utils/WebUtils.js";
import * as THREE from "../../lib/three.module.js";

class ASCIIGridLoader extends THREE.Loader
{
  constructor(manager)
  {
    super(manager);
    this.ncols = 0;
    this.nrows = 0;
    this.xcenter = 0;
    this.ycenter = 0;
    this.cellSize = 0;
    this.noDataValue = 0;
    this.grid = [];
    this.groupSize = 100;

    this.material = new THREE.MeshPhongMaterial({color: 0x808030});

    this.options = {};
  }

  load(url, onLoad, onProgress, onError)
  {
    const loader = new FileLoader(this.manager);
    loader.setPath(this.path);
    loader.setRequestHeader(this.requestHeader);
    loader.setWithCredentials(this.withCredentials);
    loader.load(url, text =>
    {
      try
      {
        onLoad(this.parse(text));
      }
      catch (ex)
      {
        if (onError)
        {
          onError(ex);
        }
        else
        {
          console.error(ex);
        }
        this.manager.itemError(url);
      }
    }, onProgress, onError);
  }

  parse(text, onCompleted, onProgress, onError)
  {
    this.parseGrid(text);

    let terrain = new THREE.Group();
    terrain.name = "Terrain";
    terrain.userData.selection = { "type" : "none" };
    terrain.userData.grid = {
      ncols : this.ncols,
      nrows : this.nrows,
      xcenter : this.xcenter,
      ycenter : this.ycenter,
      noDataValue : this.noDataValue
    };

    const groupSize = this.groupSize;
    let xsize = Math.ceil(this.ncols / groupSize);
    let ysize = Math.ceil(this.nrows / groupSize);
    let tileCount = xsize * ysize;

    const createTile = (tileIndex) =>
    {
      let i = tileIndex % xsize;
      let j = Math.floor(tileIndex / xsize);

      let solid = this.createTileGeometry(groupSize * i, groupSize * j);
      solid.name = "cell-" + i + "-" + j;
      solid.edgesVisible = false;
      terrain.add(solid);
    };

    if (onCompleted)
    {
      WebUtils.executeTasks([
        { run : () => this.parseGrid(text), message : "Parsing file..." },
        { run : createTile, message : "Creating tiles...",
          iterations : () => tileCount }],
        () => onCompleted(terrain), onProgress, error => onError(error), 100, 10);
    }
    else
    {
      this.parseGrid(text);
      for (let tileIndex = 0; tileIndex < tileCount; tileIndex++)
      {
        createTile(tileIndex);
      }
    }
    return terrain;
  }

  parseGrid(text)
  {
    let lines = text.split("\n");
    let dataRow = [];
    for (let line of lines)
    {
      line = line.trim();
      if (line.length > 0)
      {
        if (line[0].match(/[a-z]/i))
        {
          // field
          this.readField(line);
        }
        else
        {
          // grid row
          let row = line.split(" ");
          for (let col = 0; col < row.length; col++)
          {
            let point = new THREE.Vector3();
            point.x = dataRow.length * this.cellSize;
            point.y = this.grid.length * this.cellSize;
            point.z = parseFloat(row[col]);
            dataRow.push(point);
          }
          if (dataRow.length === this.ncols)
          {
            this.grid.push(dataRow);
            dataRow = [];
          }
        }
      }
    }
  }

  createTileGeometry(ox, oy)
  {
    const groupSize = this.groupSize;
    let geometry = new SolidGeometry();
    let dimx = Math.min(this.ncols - ox, groupSize + 1);
    let dimy = Math.min(this.nrows - oy, groupSize + 1);

    for (let j = oy; j < (oy + dimy); j++)
    {
      for (let i = ox; i < (ox + dimx); i++)
      {
        geometry.vertices.push(this.grid[j][i]);
      }
    }

    for (let j = 0; j < dimy - 1; j++)
    {
      for (let i = 0; i < dimx - 1; i++)
      {
        geometry.addFace(j * dimx + i,
          j * dimx + (i + 1),
          (j + 1) * dimx + i);

        geometry.addFace(j * dimx + (i + 1),
          (j + 1) * dimx + (i + 1),
          (j + 1) * dimx + i);
      }
    }

    let solid = new Solid();
    solid.material = this.material;
    solid.updateGeometry(geometry, false);

    return solid;
  }

  readField(line)
  {
    line = line.toUpperCase();
    if (line.startsWith("NCOLS"))
    {
      this.ncols = parseInt(line.substring(6).trim());
    }
    else if (line.startsWith("NROWS"))
    {
      this.nrows = parseInt(line.substring(6).trim());
    }
    else if (line.startsWith("XLLCENTER"))
    {
      this.xcenter = parseFloat(line.substring(10).trim());
    }
    else if (line.startsWith("YLLCENTER"))
    {
      this.ycenter = parseFloat(line.substring(10).trim());
    }
    else if (line.startsWith("CELLSIZE"))
    {
      this.cellSize = parseFloat(line.substring(8).trim());
    }
    else if (line.startsWith("NODATA_VALUE"))
    {
      this.noDataValue = parseFloat(line.substring(13).trim());
    }
  }
}

export { ASCIIGridLoader };
