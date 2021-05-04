BIMROCKET.GeoJSONLoader = class extends BIMROCKET.GISLoader
{
  constructor()
  {
    super("application/json");  
  }

  parse(data)
  {
    const options = this.options;
    const group = new THREE.Group();
    group.name = this.options.name || "layer";
    let jsonObject = JSON.parse(data);
    let features = jsonObject.features;
    for (let f = 0; f < features.length; f++)
    {
      let feature = features[f];
      let properties = feature.properties;
      let geometry = feature.geometry;
      if (geometry)
      {
        this.createObject(geometry.type, feature.id || "feature",
          geometry.coordinates, properties, group);
      }
      else
      {
        this.createNonVisibleObject(feature.id || "feature_nv", properties, group);
      }
    }
    return group;
  }
};
