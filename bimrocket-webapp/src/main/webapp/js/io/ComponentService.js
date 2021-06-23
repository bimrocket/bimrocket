BIMROCKET.ComponentService = class extends BIMROCKET.IOService
{
  static className = "ComponentService";
  static components = [
      ["armari", "Armari"],
      ["cadira", "Cadira"],
      ["camaro", "Crysler Camaro"],
      ["pc", "Ordinador personal"],
      ["taula", "Taula"],
      ["water", "Water"]
    ];
  
  constructor(name, description, url, username, password)
  {
    super(name, description, url, username, password);
  }

  open(path, options, readyCallback, progressCallback)
  {
    const OK = BIMROCKET.IOResult.OK;
    const COLLECTION = BIMROCKET.IOMetadata.COLLECTION;
    const OBJECT = BIMROCKET.IOMetadata.OBJECT;
    let metadata;

    if (path === "/")
    {
      let entries = [];
      let components = this.constructor.components;
      for (let i = 0; i < components.length; i++)
      {
        let component = components[i];
        metadata = new BIMROCKET.IOMetadata(component[0], component[1], OBJECT);
        entries.push(metadata);
      }
      metadata = new BIMROCKET.IOMetadata("Components", "Components", COLLECTION);
      readyCallback(new BIMROCKET.IOResult(OK, "", path, metadata, entries));
    }
    else
    {
      const loader = new THREE.ColladaLoader();
      const url = this.url + path + ".dae";
      console.info("Loading url", url);
      loader.load(url, collada => 
      {
        let object = collada.scene;
        let name = path.substring(1);
        object.name = name;
        metadata = new BIMROCKET.IOMetadata(name, name, OBJECT);
        readyCallback(new BIMROCKET.IOResult(OK, "", path, metadata, null, object));
      },
      data => 
      {
        let progress = 100 * data.loaded / data.total;
        progressCallback({progress : progress, message : "Loading..."});
      });
    }
  }
};