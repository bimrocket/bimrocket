# BIMROCKET

[![Java CI with Maven](https://github.com/bimrocket/bimrocket/actions/workflows/maven.yml/badge.svg)](https://github.com/bimrocket/bimrocket/actions/workflows/maven.yml)

BIMROCKET is an open source platform for managing BIM projects. It has a web application to view and edit IFC models and a server to store BIM projects in an OrientDB database.

## features
- Parametric design tool based on [CSG](https://en.wikipedia.org/wiki/Constructive_solid_geometry).
- Supported primitives: solids, profiles (2d shapes) and cords (3d polylines).
- Profile/cord creation and editing.
- Extrusion and revolution of profiles to create solids.
- Union, intersection and subtraction of solids.
- Object transformation (translation, rotation, scale).
- Definition of formulas for object property values.
- Measuring tools (length, angle, area and volume).
- Orbit-Pan-Zoom tool.
- Fly tool (with collision detection and ground distance control).
- Multiple selection of objects.
- Editing of model structure and object properties.
- Dynamic sectioning of models.
- Shadow casting.
- Vertex, egde and face snapping in the drawing, measurement and transformation tools.
- Scripting tool (using javascript language).
- Reporting tool to check conditions on the model objects (supported reporting formats: BRS and [IDS](https://www.buildingsmart.org/what-is-information-delivery-specification-ids/)).
- Object controllers (a Controller is a program that changes the state of an object when a certain event occurs).
- Direct loading of IFC files from local disk or the web server. Support for multiple IFC schemas (IFC2X3, IFC4 and IFC4X3_ADD2).
- Export models to IFC format.
- BIM Inventory tool to list the IFC types, classifications, groups and layers of the model.
- BIM Layout tool to visualize the interior layout of the building.
- BIM Inspector tool to inspect the IFC entities of the model.
- Search tool to find model properties by name or by value.
- Histogram tool to visualize the distribution of values ​​for a given property.
- Load/Export models in BRF format (JSON BimRocket format).
- Load/Export models in STL, GLB, Wavefront OBJ and Collada formats.
- Integrated with external services (some of them provided by bimrocket-server)
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
Both the bimrocket web application and the bimrocket server are currently distributed as Java war files. A Jakarta EE 10 web container (like [Apache Tomcat 10.1](https://tomcat.apache.org/download-10.cgi)) and JDK11+ is required to deploy these applications.

An [OrientDB](https://orientdb.org/) database is also required to work with the BCF and the IFC services (tested with OrientDB version 3.1.11).

Try it: https://bim.santfeliu.cat
