/**
 * ASCIIGridLoader.js
 *
 * @author realor
 */
import { Solid } from "../../core/Solid.js";
import { SolidGeometry } from "../../core/SolidGeometry.js";
import { GeometryUtils } from "../../utils/GeometryUtils.js";
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

    this.options = { tileType: "Mesh", groupSize : 100,
      material: new THREE.MeshPhongMaterial(
      { color: 0x505020, side : THREE.FrontSide }) };
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
    ObjectUtils.setSelectionHighlight(terrain, ObjectUtils.HIGHLIGHT_NONE);
    terrain.userData.grid = {
      ncols : this.ncols,
      nrows : this.nrows,
      xcenter : this.xcenter,
      ycenter : this.ycenter,
      cellsize : this.cellsize,
      noDataValue : this.noDataValue
    };

    const groupSize = this.options.groupSize || 100;
    let xsize = Math.ceil(this.ncols / groupSize);
    let ysize = Math.ceil(this.nrows / groupSize);
    let tileCount = xsize * ysize;

    const createTile = (tileIndex) =>
    {
      let i = tileIndex % xsize;
      let j = Math.floor(tileIndex / xsize);

      let tile = this.createTileObject(groupSize * i, groupSize * j);
      tile.name = "tile-" + i + "-" + j;
      terrain.add(tile);
    };

    if (onCompleted)
    {
      WebUtils.executeTasks([
        { run : createTile, message : "Creating tiles...",
          iterations : () => tileCount }],
        () => onCompleted(terrain), onProgress, error => onError(error), 100, 10);
    }
    else
    {
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
          const ymax = this.cellSize * this.nrows;

          for (let col = 0; col < row.length; col++)
          {
            let point = new THREE.Vector3();
            point.x = dataRow.length * this.cellSize;
            point.y = ymax - this.grid.length * this.cellSize;
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

  createTileObject(tx, ty)
  {
    if (this.options.tileType === "Solid")
    {
      return this.createSolidTile(tx, ty);
    }
    else
    {
      return this.createMeshTile(tx, ty);
    }
  }

  createMeshTile(tx, ty)
  {
    const indices = [];
    const vertices = [];
    const normals = [];

    const groupSize = this.options.groupSize || 100;
    let dimx = Math.min(this.ncols - tx, groupSize + 1);
    let dimy = Math.min(this.nrows - ty, groupSize + 1);

    const normal = new THREE.Vector3();
    for (let j = ty; j < (ty + dimy); j++)
    {
      for (let i = tx; i < (tx + dimx); i++)
      {
        let point = this.grid[j][i];
        vertices.push(point.x, point.y, point.z);
        this.getNormal(i, j, normal);
        normals.push(normal.x, normal.y, normal.z);
      }
    }

    for (let j = 0; j < dimy - 1; j++)
    {
      for (let i = 0; i < dimx - 1; i++)
      {
        // a---b
        // | / |
        // c---d

        let a = j * dimx + i;
        let b = j * dimx + (i + 1);
        let c = (j + 1) * dimx + i;
        let d = (j + 1) * dimx + (i + 1);

        indices.push(a, c, b);
        indices.push(b, c, d);
      }
    }

    let geometry = new THREE.BufferGeometry();

    geometry.setIndex(indices);
    geometry.setAttribute("position",
      new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute("normal",
      new THREE.Float32BufferAttribute(normals, 3));

    let mesh = new THREE.Mesh(geometry, this.options.material);

    return mesh;
  }

  createSolidTile(tx, ty)
  {
    const groupSize = this.options.groupSize || 100;

    let geometry = new SolidGeometry();
    let dimx = Math.min(this.ncols - tx, groupSize + 1);
    let dimy = Math.min(this.nrows - ty, groupSize + 1);

    for (let j = ty; j < (ty + dimy); j++)
    {
      for (let i = tx; i < (tx + dimx); i++)
      {
        geometry.vertices.push(this.grid[j][i]);
      }
    }

    for (let j = 0; j < dimy - 1; j++)
    {
      for (let i = 0; i < dimx - 1; i++)
      {
        // a---b
        // | / |
        // c---d

        let a = j * dimx + i;
        let b = j * dimx + (i + 1);
        let c = (j + 1) * dimx + i;
        let d = (j + 1) * dimx + (i + 1);

        geometry.addFace(a, c, b);
        geometry.addFace(b, c, d);
      }
    }

    let solid = new Solid();
    solid.material = this.options.material;
    solid.edgesVisible = false;

    solid.updateGeometry(geometry, false);

    return solid;
  }

  getNormal(i, j, normal)
  {
    const vertices = [];

    if (i > 0 && j > 0)
    {
      vertices.push(this.grid[j - 1][i - 1]);
    }
    if (i > 0)
    {
      vertices.push(this.grid[j][i - 1]);
    }
    if (i > 0 && j < this.nrows - 1)
    {
      vertices.push(this.grid[j + 1][i - 1]);
    }

    if (j < this.nrows - 1)
    {
      vertices.push(this.grid[j + 1][i]);
    }
    if (i < this.ncols - 1 && j < this.nrows - 1)
    {
      vertices.push(this.grid[j + 1][i + 1]);
    }
    if (i < this.ncols - 1)
    {
      vertices.push(this.grid[j][i + 1]);
    }
    if (i < this.ncols - 1 && j > 0)
    {
      vertices.push(this.grid[j - 1][i + 1]);
    }
    if (j > 0)
    {
      vertices.push(this.grid[j - 1][i]);
    }

    return GeometryUtils.calculateNormal(vertices, null, normal);
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
