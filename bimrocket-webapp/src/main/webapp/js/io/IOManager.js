/**
 * IOManager.js
 *
 * @author realor
 */

import { ObjectUtils } from "../utils/ObjectUtils.js";
import { WebUtils } from "../utils/WebUtils.js";
import * as THREE from "three";

class IOManager
{
  /*
    Format definition:
    {
      description : {string} format description,
      extensions : [{string}] extensions array,
      mimeType : {string} the mime type,
      dataType : {string} "text" | "arraybuffer",
      loader :
      {
        class : {class} the loader class,
        loadMethod : {number} loader method code
      },
      exporter :
      {
        class : {class} the exporter class,
        exportMethod : {number} exporter method code
      }
    }
  */

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
    const formats = this.formats;
    for (let formatName in formats)
    {
      let formatInfo = formats[formatName];
      if (formatInfo.extensions.indexOf(extension) !== -1) return formatName;
    }
    return null;
  }

  static getFormatInfo(fileName)
  {
    let formatName = this.getFormat(fileName);
    let formatInfo = formatName ?
      this.formats[formatName] :
      this.formats[fileName];
    return formatInfo || null;
  }

  static getFormatInfoByMimeType(mimeType)
  {
    const formats = this.formats;
    for (let formatName in formats)
    {
      let formatInfo = formats[formatName];
      if (formatInfo.mimeType === mimeType) return formatInfo;
    }
  }

  static getLoaderOptions(formatName, factoryDefault = false)
  {
    let formatInfo = this.formats[formatName];
    if (!formatInfo?.loader) "Unsupported format: " + formatName;

    let options;
    let value = window.localStorage.getItem("bimrocket.io.loader." + formatName);
    if (factoryDefault || !value)
    {
      options = formatInfo.loader.class.options || {};
    }
    else
    {
      options = JSON.parse(value);
    }
    return options;
  }

  static setLoaderOptions(formatName, options)
  {
    const value = JSON.stringify(options);
    window.localStorage.setItem("bimrocket.io.loader." + formatName, value);
  }

  static getExporterOptions(formatName, factoryDefault = false)
  {
    let formatInfo = this.formats[formatName];
    if (!formatInfo?.exporter) "Unsupported format: " + formatName;

    let options;
    let value = window.localStorage.getItem("bimrocket.io.exporter." + formatName);
    if (factoryDefault || !value)
    {
      options = formatInfo.exporter.class.options || {};
    }
    else
    {
      options = JSON.parse(value);
    }
    return options;
  }

  static setExporterOptions(formatName, options)
  {
    const value = JSON.stringify(options);
    window.localStorage.setItem("bimrocket.io.exporter." + formatName, value);
  }

  static load(intent)
  {
    let formatName = intent.format;
    let url = intent.url;
    let data = intent.data; // string or ArrayBuffer
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

      let formatInfo = this.formats[formatName];

      let loader;
      if (formatInfo?.loader)
      {
        loader = new formatInfo.loader.class(manager);
        loader.loadMethod = formatInfo.loader.loadMethod || 0;
      }
      else throw "Unsupported format: " + formatName;

      const options = this.getLoaderOptions(formatName);

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
          if (request.readyState === XMLHttpRequest.DONE)
          {
            if (onProgress) onProgress({progress : 100, message : ""});

            if (request.status === 0 ||
              request.status === 200 || request.status === 207)
            {
              if (formatInfo.dataType === "arraybuffer")
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
          else if (request.readyState === XMLHttpRequest.LOADING)
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
        request.setRequestHeader("X-Requested-With", "XMLHttpRequest");
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
    let onCompleted = intent.onCompleted; // returns Blob
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

      let formatInfo = this.formats[formatName];

      let exporter;
      if (formatInfo?.exporter)
      {
        exporter = new formatInfo.exporter.class();
        exporter.exportMethod = formatInfo.exporter.exportMethod || 0;
        exporter.mimeType = formatInfo.mimeType || 'application/octet-stream';
      }
      else throw "Unsupported format: " + formatName;

      const options = this.getExporterOptions(formatName);

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
      else // general case: BRFLoader, STLLoader, PCDLoader, OBJLoader...
      {
        let result = loader.parse(data);
        console.info("result", result);
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
    const formats = this.formats;
    for (let formatName in formats)
    {
      let formatInfo = formats[formatName];
      extensions.push(...formatInfo.extensions);
    }
    return extensions;
  }

  static normalizeFilename(filename)
  {
    let buffer = "";
    for (let ch of filename)
    {
      let uch = ch.toUpperCase();
      if ((uch >= 'A' && uch <= 'Z') ||
          (uch >= '0' && uch <= '9') || uch === "_")
      {
        buffer += ch;
      }
      else if (uch === " " || uch === "-" || uch === ":")
      {
        buffer += "_";
      }
    }
    return buffer;
  }
}

window.IOManager = IOManager;

export { IOManager };


