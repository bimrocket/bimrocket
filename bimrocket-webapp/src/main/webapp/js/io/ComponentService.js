BIMROCKET.ComponentService = function(name, description, url, username, password)
{
  BIMROCKET.IOService.call(this, name, description, url, username, password);
  this.components = [
    ["armari", "Armari"],
    ["cadira", "Cadira"],
    ["camaro", "Crysler Camaro"],
    ["pc", "Ordinador personal"],
    ["taula", "Taula"],
    ["water", "Water"]
  ];
};

BIMROCKET.ComponentService.prototype = Object.create(BIMROCKET.IOService.prototype);

BIMROCKET.ComponentService.prototype.open = function(path, options,
  readyCallback, progressCallback)
{
  var OK = BIMROCKET.IOResult.OK;
  var COLLECTION = BIMROCKET.IOMetadata.COLLECTION;
  var OBJECT = BIMROCKET.IOMetadata.OBJECT;
  var metadata;

  if (path === "/")
  {
    var entries = [];
    for (var i = 0; i < this.components.length; i++)
    {
      var component = this.components[i];
      metadata = new BIMROCKET.IOMetadata(component[0], component[1], OBJECT);
      entries.push(metadata);
    }
    metadata = new BIMROCKET.IOMetadata("Components", "Components", COLLECTION);
    readyCallback(new BIMROCKET.IOResult(OK, "", path, metadata, entries));
  }
  else
  {
    var loader = new THREE.ColladaLoader();
//    loader.options.convertUpAxis = false;
    var url = this.url + path + ".dae";
    console.info("Loading url", url);
    loader.load(url, function(collada)
    {
      var object = collada.scene;
      var name = path.substring(1);
      object.name = name;
      metadata = new BIMROCKET.IOMetadata(name, name, OBJECT);
      readyCallback(new BIMROCKET.IOResult(OK, "", path, metadata, null, object));
    },
    function(data)
    {
      var progress = 100 * data.loaded / data.total;
      progressCallback({progress : progress, message : "Loading..."});
    });
  }
};