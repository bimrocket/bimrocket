BIMROCKET.GMLLoader = class extends BIMROCKET.GISLoader
{
  constructor()
  {
    super("text/xml; subtype=gml/3.1.1");  
  }

  parse(xml)
  {
    let group = new THREE.Group();
    //TODO: parse xml
    return group;
  }
};
