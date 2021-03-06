/**
 * IOManager.js
 *
 * @author realor
 */

import { ObjectUtils } from "../utils/ObjectUtils.js";
import { WebUtils } from "../utils/WebUtils.js";
import * as THREE from "../lib/three.module.js";

class IOManager
{
  static formats = {};

  static getFormat(fileName)
  {
    let extension = null;
    if (typeof fileName === "string")
    {
      let index = fileName.lastIndexOf(".");
      if (index !== -1)
      {
        extension = fileName.substring(index + 1).toLowerCase();
      }
    }
    if (extension === null) return null;
    for (let formatName in this.formats)
    {
      let formatInfo = this.formats[formatName];
      if (formatInfo.extensions.indexOf(extension) !== -1) return formatName;
    }
    return null;
  }

  static getFormatInfo(fileName)
  {
    let formatName = this.getFormat(fileName);
    let formatInfo = formatName ?
      IOManager.formats[formatName] :
      IOManager.formats[fileName];
    return formatInfo || null;
  }

  static load(intent)
  {
    let formatName = intent.format;
    let url = intent.url;
    let data = intent.data;
    let onCompleted = intent.onCompleted; // onCompleted(object3D)
    let onProgress = intent.onProgress; // onProgress({progress: 0..100, message: text})
    let onError = intent.onError; // onError(error)
    let manager = intent.manager; // LoadingManager
    let units = intent.units || "m"; // application units
    let basicAuthCredentials = intent.basicAuthCredentials;

    try
    {
      if (!formatName && url)
      {
        formatName = this.getFormat(url);
      }
      if (!formatName) throw "Can't determinate format";

      let formatInfo = IOManager.formats[formatName];

      let loader;
      if (formatInfo && formatInfo.loader)
      {
        loader = new formatInfo.loader.class(manager);
        loader.loadMethod = formatInfo.loader.loadMethod || 0;
      }
      else throw "Unsupported format: " + formatName;

      const options = Object.assign({},
        formatInfo.loader.options, intent.options);

      if (data)
      {
        this.parseData(loader, url, data, units,
          onCompleted, onProgress, onError, options);
      }
      else
      {
        let request = new XMLHttpRequest();
        let length = -1;
        request.onreadystatechange = () =>
        {
          if (request.readyState === 4)
          {
            if (onProgress) onProgress({progress : 100, message : ""});

            if (request.status === 0 ||
              request.status === 200 || request.status === 207)
            {
              if (formatInfo.loader.dataType === "arraybuffer")
              {
                data = request.response.arrayBuffer();
              }
              else
              {
                data = request.responseText;
              }
              this.parseData(loader, url, data, units,
                onCompleted, onProgress, onError, options);
            }
            else
            {
              if (onError)
              {
                let message = WebUtils.getHttpStatusMessage(request.status);
                onError(message + " (HTTP " + request.status + ")");
              }
            }
          }
          else if (request.readyState === 3)
          {
            if (onProgress)
            {
              if (length === -1)
              {
                length = request.getResponseHeader("Content-Length");
              }
              else
              {
                let progress;
                if (length > 0)
                {
                  progress = Math.round(
                    100 * request.responseText.length / length);
                }
                else
                {
                  progress = undefined;
                }
                let message = "Downloading file...";
                onProgress({ progress : progress, message : message });
              }
            }
          }
        };
        request.open("GET", url, true);
        if (basicAuthCredentials)
        {
          WebUtils.setBasicAuthorization(request,
            basicAuthCredentials.username, basicAuthCredentials.password);
        }
        request.send();
      }
    }
    catch (ex)
    {
      if (onError) onError(ex);
    }
  }

  static export(intent)
  {
    let formatName = intent.format;
    let fileName = intent.name;
    let onCompleted = intent.onCompleted;
    let onProgress = intent.onProgress;
    let onError = intent.onError;
    let object = intent.object;

    try
    {
      if (!formatName && fileName)
      {
        formatName = this.getFormat(fileName);
      }

      if (!formatName) throw "Can't determinate format";

      let formatInfo = IOManager.formats[formatName];

      let exporter;
      if (formatInfo && formatInfo.exporter)
      {
        exporter = new formatInfo.exporter.class();
        exporter.exportMethod = formatInfo.exporter.exportMethod || 0;
        exporter.mimeType = formatInfo.mimeType || 'application/octet-stream';
      }
      else throw "Unsupported format: " + formatName;

      const options = Object.assign({},
        formatInfo.exporter.options, intent.options);

      this.parseObject(exporter, object,
        onCompleted, onProgress, onError, options);
    }
    catch (ex)
    {
      if (onError) onError(ex);
    }
  }

  static parseData(loader, url, data, units,
    onCompleted, onProgress, onError, options)
  {
    const loadCompleted = model =>
    {
      ObjectUtils.scaleModel(model, units);
      model.traverse(object => object.updateMatrix());
      if (onCompleted) onCompleted(model);
    };

    try
    {
      if (loader.loadMethod === 1) // ColladaLoader
      {
        let path = THREE.LoaderUtils.extractUrlBase(url);
        let result = loader.parse(data, path);
        loadCompleted(result.scene);
      }
      else if (loader.loadMethod === 2) // IFCLoader
      {
        loader.parse(data, loadCompleted, onProgress, onError, options);
      }
      else if (loader.loadMethod === 3) // GLTFLoader
      {
        let path = THREE.LoaderUtils.extractUrlBase(url);
        loader.parse(data, path,
          result => loadCompleted(result.scene), onError);
      }
      else // general case: BRFLoader, STLLoader, OBJLoader...
      {
        let result = loader.parse(data);
        let object = this.createObject(result);
        loadCompleted(object);
      }
    }
    catch (ex)
    {
      if (onError) onError(ex);
    }
  }

  static parseObject(exporter, object,
    onCompleted, onProgress, onError, options)
  {
    const exportCompleted = result =>
    {
      let data = "";
      if (result)
      {
        let mimeType = exporter.mimeType;
        if (typeof result === "string")
        {
          data = new Blob([result], { type: mimeType });
        }
        else if (result instanceof ArrayBuffer)
        {
          data = new Blob([result], { type : mimeType });
        }
        else if (typeof result.data === "string")
        {
          data = new Blob([result.data], { type: mimeType });
        }
        else if (typeof result === "object")
        {
          data = new Blob([JSON.stringify(result)], { type : mimeType });
        }
        else
        {
          console.warn("Unsupported export result", result);
        }
      }
      if (onCompleted) onCompleted(data);
    };

    try
    {
      if (exporter.exportMethod === 1)
      {
        exporter.parse(object, exportCompleted, onError, options);
      }
      else // general export method
      {
        exportCompleted(exporter.parse(object, options));
      }
    }
    catch (ex)
    {
      if (onError) onError(ex);
    }
  }

  static createObject(result)
  {
    if (result instanceof THREE.BufferGeometry)
    {
      let geometry = result;
      let material = new THREE.MeshPhongMaterial(
        {color : 0x008000, side : THREE.DoubleSide});
      return new THREE.Mesh(geometry, material);
    }
    else if (result instanceof THREE.Object3D)
    {
      return result;
    }
  }

  static getSupportedLoaderExtensions()
  {
    const extensions = [];
    const formats = IOManager.formats;
    for (let formatName in formats)
    {
      let formatInfo = formats[formatName];
      extensions.push(...formatInfo.extensions);
    }
    return extensions;
  }
}

export { IOManager };


