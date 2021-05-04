/*
 * AutoPilotController.js
 *
 * @autor: realor
 */

BIMROCKET.AutoPilotController = class extends BIMROCKET.Controller
{
  static type = "AutoPilotController";
  static description = "Pilot an object.";
  
  constructor(application, object, name)
  {
    super(application, object, name);

    this.distance = this.createProperty("number", "Distance (m)");
    this.maxVelocity = this.createProperty("number", "Maximum velocity (m/s)");
    this.maxAcceleration = this.createProperty("number", "Maximum acceleration (m2/s)");
    this.vehicles = this.createProperty("string", "Vehicles group");
    this.trafficLights = this.createProperty("string", "Traffic lights group");

    this._animate = this.animate.bind(this);

    this._position0 = this.object.position.clone();
    this._direction = new THREE.Vector3();
    this.object.updateMatrix();
    this.object.updateMatrixWorld();

    var te = this.object.matrix.elements;
    this._direction.set(te[4], te[5], te[6]).normalize(); // relative to parent

    this._vector1 = new THREE.Vector3();
    this._vector2 = new THREE.Vector3(0, 1, 0); // y axis
    this.object.localToWorld(this._vector1);
    this.object.localToWorld(this._vector2);
    this._directionWorld = new THREE.Vector3();
    this._directionWorld.subVectors(this._vector2, this._vector1).normalize();

    this._velocity = 0;
    this._acceleration = 0;

    this._sleep = 0;
  }

  onStart()
  {
    const application = this.application;
    this._vehicles = application.scene.getObjectByName(this.vehicles.value);
    this._trafficLights = application.scene.getObjectByName(this.trafficLights.value);

    application.updateVisibility(this.object, false, true, true);

    application.addEventListener("animation", this._animate);
  }

  onStop()
  {
    var application = this.application;
    application.removeEventListener("animation", this._animate);
  }

  animate(event)
  {
    if (this._sleep > 0)
    {
      this._sleep -= event.delta;
      if (this._sleep <= 0)
      {
        // reset position, velocity and acceleration
        this.object.position.copy(this._position0);
        this._velocity = 0;
        this._acceleration = 0;
        this.object.visible = true;
      }
    }
    else
    {
      var safetyDistance = 8;
      var reductionDistance = 15;

      var vehicle = this.getClosestVehicle();
      var trafficLight = this.getClosestTrafficLight();
      var obstacle = vehicle.distance < trafficLight.distance ?
        vehicle : trafficLight;

      console.info(obstacle);

      if (obstacle.distance >= reductionDistance ||
          this._velocity < obstacle.velocity)
      {
        if (obstacle.distance > safetyDistance)
        {
          this._acceleration = parseFloat(this.maxAcceleration.value);
        }
      }
      else // match velocities
      {
        var vdelta = this._velocity - obstacle.velocity;
        this._acceleration = -(vdelta * vdelta) /
          Math.max(obstacle.distance - safetyDistance, 0.01);
      }
      this._velocity += this._acceleration * event.delta;

      if (this._velocity > this.maxVelocity.value)
      {
        this._velocity = parseFloat(this.maxVelocity.value);
      }
      else if (this._velocity < 0)
      {
        this._velocity = 0;
      }

      var delta = this._velocity * event.delta;
      // TODO: add v-axis vector
      this.object.position.x += delta * this._direction.x;
      this.object.position.y += delta * this._direction.y;
      this.object.position.z += delta * this._direction.z;

      if (this.object.position.distanceTo(this._position0) > this.distance.value)
      {
        this._sleep = Math.random() * 10;
        this.object.visible = false;
      }
      var changeEvent = {type : "nodeChanged", object : this.object, 
        source: this};
      this.application.notifyEventListeners("scene", changeEvent);
    }
  }

  getClosestVehicle()
  {
    var minDistance = 1000;
    var velocity = 0;
    var closestVehicle = null;
    if (this._vehicles)
    {
      var position = new THREE.Vector3();
      this.object.localToWorld(position);
      var vehiclePosition = new THREE.Vector3();
      var vector = new THREE.Vector3();

      var children = this._vehicles.children;
      for (var i = 0; i < children.length; i++)
      {
        var vehicle = children[i];
        if (vehicle !== this.object && vehicle.visible && 
            vehicle instanceof BIMROCKET.Brep)
        {
          vehiclePosition.set(0, 0, 0);
          vehicle.localToWorld(vehiclePosition);
          vector.subVectors(vehiclePosition, position);
          var vehicleDistance = vector.length();
          if (vehicleDistance < minDistance)
          {
            var linearDistance = vector.dot(this._directionWorld);
            if (linearDistance > 0) // is not behind
            {
              var margin = Math.sqrt(vehicleDistance * vehicleDistance - 
                linearDistance * linearDistance);
              if (margin < 2) // car width 
              {
                closestVehicle = vehicle;
                minDistance = vehicleDistance;
                if (vehicle.controllers && vehicle.controllers[0] && 
                  vehicle.controllers[0]._velocity)
                {
                  velocity = vehicle.controllers[0]._velocity;
                }
                else
                {
                  velocity = 0;
                }
              }
            }
          }
        }
      }
    }
    return {distance: minDistance, velocity: velocity, object: closestVehicle};
  }

  getClosestTrafficLight()
  {
    var minDistance = 1000;
    var closestLight = null;
    if (this._trafficLights)
    {
      var position = new THREE.Vector3();
      this.object.localToWorld(position);
      var lightPosition = new THREE.Vector3();
      var lightDirection = new THREE.Vector3();
      var vector = new THREE.Vector3();

      var children = this._trafficLights.children;
      for (var i = 0; i < children.length; i++)
      {
        var light = children[i];
        if (light.userData['Dynamic'] &&
            light.userData['Dynamic']['state'] > 1) // not green
        {
          lightPosition.set(0, 0, 0);
          light.localToWorld(lightPosition);
          vector.subVectors(lightPosition, position);
          var lightDistance = vector.length();
          if (lightDistance < minDistance)
          {
            vector.normalize();
            if (vector.dot(this._directionWorld) > 0.8) // light is in front of us
            {
              this._vector1.set(0, 0, 0);
              this._vector2.set(0, 1, 0); // y axis
              light.localToWorld(this._vector1);
              light.localToWorld(this._vector2);
              lightDirection.subVectors(this._vector2, this._vector1).normalize();
              if (lightDirection.dot(this._directionWorld) < -0.8)
              {
                // light looks at car
                minDistance = lightDistance;
                closestLight = light;
              }
            }
          }
        }
      }
    }
    return {distance: minDistance, velocity: 0, object: closestLight};
  }
};

BIMROCKET.controllers.push(BIMROCKET.AutoPilotController);



