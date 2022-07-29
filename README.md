# BIMROCKET

[![Java CI with Maven](https://github.com/bimrocket/bimrocket/actions/workflows/maven.yml/badge.svg)](https://github.com/bimrocket/bimrocket/actions/workflows/maven.yml)

BIMROCKET is an open source platform for managing BIM projects. It has a web application to view and edit IFC models and a server to store BIM projects in an OrientDB database.

## features
- Parametric design tool based on [CSG](https://en.wikipedia.org/wiki/Constructive_solid_geometry).
- Supported primitives: solids, profiles (2d shapes) and cords (3d polylines).
- Union, intersection and subtraction of solids.
- Extrusion of profiles.
- Object transformation (translation, rotation, scale).
- Definition of formulas for object property values.
- Measuring tools (length, area and volume).
- Orbit-Pan-Zoom tool.
- Fly tool (collision detection and ground distance control).
- Multiple selection of objects.
- Edition of the model structure and the object properties.
- Dynamic sectioning of models.
- Shadow casting.
- Vertex, egde and face snapping in the drawing, measurement and transformation tools.
- Scripting tool.
- Object controllers (programs that change the object state)
- Load IFC files directly from local disk or the web server. Support for multiple IFC schemas (IFC2x3, IFC4, ...).
- IFC Inventory tool to explore the types, classifications, groups and layers of the model.
- IFC Layout tool to view the building layout easily.
- Load/Export models in BRF format (JSON BimRocket format).
- Load/Export models in STL, GLB, Wavefront OBJ and Collada formats.
- Integrated with external services (some of them provided by bimrocke_t-server)
  - File service (Webdav implementation)
  - [BCF](https://en.wikipedia.org/wiki/BIM_Collaboration_Format) service (BIM Collaboration Service)
  - [WFS](https://en.wikipedia.org/wiki/Web_Feature_Service) service (Web Feature Service)
  - IFC service (stores IFC models in database. In progress)
  - Print service (generates a vectorial PDF file)
  - [Brain4it](http://brain4it.org) (AI platform oriented to the IoT)
- Modular design to easily extend functionality.
- Web application with a responsive user interface. Support for touch devices.
- Based on [THREE.js](https://threejs.org) library.
- Built with Maven.


![Facility exterior](/docs/images/screenshot1.png?raw=true "Facility exterior")

![Facility interior](/docs/images/screenshot2.png?raw=true "Facility interior")

## Installation
Both the bimrocket web application and the bimrocket server are currently distributed as Java war files. A Jakarta EE 9 web container (like [Apache Tomcat 10](https://tomcat.apache.org/download-10.cgi)) is required to deploy these applications.

An [OrientDB](https://orientdb.org/) database is also required to work with the BCF and the IFC services.

Try it: https://bim.santfeliu.cat
