# BIMROCKET

[![Java CI with Maven](https://github.com/bimrocket/bimrocket/actions/workflows/maven.yml/badge.svg)](https://github.com/bimrocket/bimrocket/actions/workflows/maven.yml)

BIMROCKET is an open source platform for BIM project management. It features a web application for viewing and editing IFC models and a server for storing BIM projects in an OrientDB database.

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
- Realistic shading: shadow casting and ambient occlusion.
- Vertex, egde and face snapping in the drawing, measurement and transformation tools.
- Scripting tool (using javascript language).
- Reporting tool to check conditions on the model objects (supported reporting formats: BRS and [IDS](https://www.buildingsmart.org/what-is-information-delivery-specification-ids/)).
- Object controllers (a Controller is a program that changes the state of an object when a certain event occurs).
- BIM Inventory tool to list the IFC types, classifications, groups and layers of the model.
- BIM Layout tool to visualize the interior layout of the building.
- BIM Inspector tool to inspect the IFC entities of the model.
- BIM Delta tool to detect changes between two versions of an IFC file.
- Search tool to find model properties by name or by value.
- Histogram tool to visualize the distribution of values ​​for a given property.
- Multiple file storage systems are supported: webdav server, local file system and IndexedDB.
- Load/Export IFC models. Support for multiple IFC schemas (IFC2X3, IFC4 and IFC4X3_ADD2).
- Load/Export models in BRF format (JSON BimRocket format).
- Load/Export models in STL, GLB, Wavefront OBJ and Collada formats.
- Integrated with external services (some of them provided by bimrocket-server)
  - Webdav server
  - [BCF](https://en.wikipedia.org/wiki/BIM_Collaboration_Format) service (BIM Collaboration Service)
  - [bSDD](https://www.buildingsmart.org/users/services/buildingsmart-data-dictionary/) service (buildingSmart Data Dictionary)
  - [WFS](https://www.ogc.org/es/publications/standard/wfs/) service (OGC Web Feature Service)
  - [Brain4it](http://brain4it.org) (AI platform oriented to the IoT)
  - IFCDB service (stores IFC models in external database. In progress)
  - Print service (generates a vectorial PDF file)
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
