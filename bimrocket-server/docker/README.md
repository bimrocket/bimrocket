# Deployment of Docker Containers for Backend
The following describes the steps to deploy the Bimrocket system locally.

## Build and starts up
- Build the project with:
  ```sh
  mvn clean install
  ```

## BBDD: Database
Bimrocket's system is ready to deploy both **MongoDB** and **OrientDB**. This is managed through the application.yaml configuration files and the various docker-compose.yml files.

### Deployment in OrientBD
[Link](https://orientdb.dev/)
**Version:** *3.2.39*

OrientDB is a multi-model *NoSQL* database that combines the features of a document database, a graph database, and an object database in a single engine. It allows flexible data modeling and supports complex relationships through graph structures while maintaining document-based storage.

**Files:**
- [application.orientdb.yaml](.\application.orientdb.yaml)
- [docker-compose.orientdb.yml](.\docker-compose.orientdb.yml)

From the `/docker` directory, build images and deploy the containers:
  ```sh
  docker-compose up -f docker-compose.orientdb.yml --build -d
  ```

### Deployment in MongoDB
[Link](https://www.mongodb.com/)
**Version:** *8.0.13*

**MongoDB** is a widely used *NoSQL* document-oriented database designed for scalability, performance, and ease of development. It stores data in flexible *JSON-like* documents, making it ideal for modern applications that require dynamic schemas and rapid iteration.

**Files:**
- [application.mongodb.yaml](.\application.mongodb.yaml)
- [docker-compose.mongodb.yml](.\docker-compose.mongodb.yml)

From the `/docker` directory, build images and deploy the containers:
  ```sh
  docker-compose up -f docker-compose.mongodb.yml --build -d
  ```

### Docker Compose

- To access the **Backend API:** http://localhost:9090/bimrocket-server/  (default port)

