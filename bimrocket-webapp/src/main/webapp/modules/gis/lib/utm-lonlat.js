/*
 MIT License

 Copyright (c) 2016-2019 utm-latlng author

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
 */

export function toDegrees(radians)
{
  return radians / Math.PI * 180;
}

export function toRadians(degrees)
{
  return degrees * Math.PI / 180;
}

export function precisionRound(number, precision)
{
  const factor = Math.pow(10, precision);
  return Math.round(number * factor) / factor;
}

export function getUtmLetterDesignator(latitude)
{
  latitude = parseFloat(latitude);
  if ((84 >= latitude) && (latitude >= 72))
    return 'X';
  else if ((72 > latitude) && (latitude >= 64))
    return 'W';
  else if ((64 > latitude) && (latitude >= 56))
    return 'V';
  else if ((56 > latitude) && (latitude >= 48))
    return 'U';
  else if ((48 > latitude) && (latitude >= 40))
    return 'T';
  else if ((40 > latitude) && (latitude >= 32))
    return 'S';
  else if ((32 > latitude) && (latitude >= 24))
    return 'R';
  else if ((24 > latitude) && (latitude >= 16))
    return 'Q';
  else if ((16 > latitude) && (latitude >= 8))
    return 'P';
  else if ((8 > latitude) && (latitude >= 0))
    return 'N';
  else if ((0 > latitude) && (latitude >= -8))
    return 'M';
  else if ((-8 > latitude) && (latitude >= -16))
    return 'L';
  else if ((-16 > latitude) && (latitude >= -24))
    return 'K';
  else if ((-24 > latitude) && (latitude >= -32))
    return 'J';
  else if ((-32 > latitude) && (latitude >= -40))
    return 'H';
  else if ((-40 > latitude) && (latitude >= -48))
    return 'G';
  else if ((-48 > latitude) && (latitude >= -56))
    return 'F';
  else if ((-56 > latitude) && (latitude >= -64))
    return 'E';
  else if ((-64 > latitude) && (latitude >= -72))
    return 'D';
  else if ((-72 > latitude) && (latitude >= -80))
    return 'C';
  else
    return 'Z';
}

export function getEllipsoid(name = 'WGS 84')
{
  const ellipsoids =
  {
    'Airy': {a: 6377563, eccSquared: 0.00667054},
    'Australian National': {a: 6378160, eccSquared: 0.006694542},
    'Bessel 1841': {a: 6377397, eccSquared: 0.006674372},
    'Bessel 1841 Nambia': {a: 6377484, eccSquared: 0.006674372},
    'Clarke 1866': {a: 6378206, eccSquared: 0.006768658},
    'Clarke 1880': {a: 6378249, eccSquared: 0.006803511},
    'Everest': {a: 6377276, eccSquared: 0.006637847},
    'Fischer 1960 Mercury': {a: 6378166, eccSquared: 0.006693422},
    'Fischer 1968': {a: 6378150, eccSquared: 0.006693422},
    'GRS 1967': {a: 6378160, eccSquared: 0.006694605},
    'GRS 1980': {a: 6378137, eccSquared: 0.00669438},
    'Helmert 1906': {a: 6378200, eccSquared: 0.006693422},
    'Hough': {a: 6378270, eccSquared: 0.00672267},
    'International': {a: 6378388, eccSquared: 0.00672267},
    'Krassovsky': {a: 6378245, eccSquared: 0.006693422},
    'Modified Airy': {a: 6377340, eccSquared: 0.00667054},
    'Modified Everest': {a: 6377304, eccSquared: 0.006637847},
    'Modified Fischer 1960': {a: 6378155, eccSquared: 0.006693422},
    'South American 1969': {a: 6378160, eccSquared: 0.006694542},
    'WGS 60': {a: 6378165, eccSquared: 0.006693422},
    'WGS 66': {a: 6378145, eccSquared: 0.006694542},
    'WGS 72': {a: 6378135, eccSquared: 0.006694318},
    'ED50': {a: 6378388, eccSquared: 0.00672267},
    'WGS 84': {a: 6378137, eccSquared: 0.00669438},
    // Max deviation from WGS 84 is 40 cm/km see http://ocq.dk/euref89 (in danish)
    'EUREF89': {a: 6378137, eccSquared: 0.00669438},
    // Same as EUREF89
    'ETRS89': {a: 6378137, eccSquared: 0.00669438},
  };

  if (typeof ellipsoids[name] !== 'object')
  {
    throw new Error(`${ name } is not valid, selection one of ${ Object.keys(ellipsoids).join(', ') }`);
  }

  return ellipsoids[name];
}

export function toUtm(latitude, longitude, precision, ellipsoidName)
{
  const { a, eccSquared } = getEllipsoid(ellipsoidName);

  if (!Number.isInteger(precision))
  {
    throw new Error('Precision is not a integer');
  }

  latitude = parseFloat(latitude);
  longitude = parseFloat(longitude);
  const latitudeRadians = toRadians(latitude);
  const longitudeRadians = toRadians(longitude);
  let zoneNumber;

  if (longitude >= 8 && longitude <= 13 && latitude > 54.5 && latitude < 58)
  {
    zoneNumber = 32;
  }
  else if (latitude >= 56.0 && latitude < 64.0 && longitude >= 3.0 && longitude < 12.0)
  {
    zoneNumber = 32;
  }
  else
  {
    zoneNumber = ((longitude + 180) / 6) + 1;

    if (latitude >= 72.0 && latitude < 84.0)
    {
      if (longitude >= 0.0 && longitude < 9.0)
      {
        zoneNumber = 31;
      }
      else if (longitude >= 9.0 && longitude < 21.0)
      {
        zoneNumber = 33;
      }
      else if (longitude >= 21.0 && longitude < 33.0)
      {
        zoneNumber = 35;
      }
      else if (longitude >= 33.0 && longitude < 42.0)
      {
        zoneNumber = 37;
      }
    }
  }

  zoneNumber = parseInt(zoneNumber);

  const longitudeOrigin = (zoneNumber - 1) * 6 - 180 + 3;  //+3 puts origin in middle of zone
  const longitudeOriginRadians = toRadians(longitudeOrigin);

  const zoneLetter = getUtmLetterDesignator(latitude);

  const eccPrimeSquared = (eccSquared) / (1 - eccSquared);

  const N = a / Math.sqrt(1 - eccSquared * Math.sin(latitudeRadians) * Math.sin(latitudeRadians));
  const T = Math.tan(latitudeRadians) * Math.tan(latitudeRadians);
  const C = eccPrimeSquared * Math.cos(latitudeRadians) * Math.cos(latitudeRadians);
  const A = Math.cos(latitudeRadians) * (longitudeRadians - longitudeOriginRadians);

  const M = a * ((1 - eccSquared / 4 - 3 * eccSquared * eccSquared / 64 - 5 * eccSquared * eccSquared * eccSquared / 256) * latitudeRadians
          - (3 * eccSquared / 8 + 3 * eccSquared * eccSquared / 32 + 45 * eccSquared * eccSquared * eccSquared / 1024) * Math.sin(2 * latitudeRadians)
          + (15 * eccSquared * eccSquared / 256 + 45 * eccSquared * eccSquared * eccSquared / 1024) * Math.sin(4 * latitudeRadians)
          - (35 * eccSquared * eccSquared * eccSquared / 3072) * Math.sin(6 * latitudeRadians));

  let easting = parseFloat(0.9996 * N * (A + (1 - T + C) * A * A * A / 6
          + (5 - 18 * T + T * T + 72 * C - 58 * eccPrimeSquared) * A * A * A * A * A / 120)
          + 500000.0);

  let northing = parseFloat(0.9996 * (M + N * Math.tan(latitudeRadians) * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * A * A * A * A / 24
          + (61 - 58 * T + T * T + 600 * C - 330 * eccPrimeSquared) * A * A * A * A * A * A / 720)));

  if (latitude < 0)
  {
    northing += 10000000.0;
  }
  northing = precisionRound(northing, precision);
  easting = precisionRound(easting, precision);

  return { easting, northing, zoneNumber, zoneLetter };
}

export function fromUtm(easting, northing, zoneNumber, zoneLetter, ellipsoidName)
{
  const {a, eccSquared} = getEllipsoid(ellipsoidName);
  if (typeof easting !== 'number')
  {
    throw new Error('Could not find a valid easting number');
  }
  if (typeof northing !== 'number')
  {
    throw new Error('Could not find a valid northing number');
  }
  if (typeof northing !== 'number')
  {
    throw new Error('Could not find a valid zone number');
  }
  if (typeof zoneLetter !== 'string')
  {
    throw new Error('Could not find a zone letter');
  }

  const e1 = (1 - Math.sqrt(1 - eccSquared)) / (1 + Math.sqrt(1 - eccSquared));
  const northernHemisphere = (['N', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'].indexOf(zoneLetter) !== -1) ? 1 : 0;
  const y = northernHemisphere === 0 ? northing - 10000000.0 : northing;
  const x = easting - 500000.0; //remove 500,000 meter offset for longitude
  const longitudeOrigin = (zoneNumber - 1) * 6 - 180 + 3;
  const eccPrimeSquared = (eccSquared) / (1 - eccSquared);

  const M = y / 0.9996;
  const mu = M / (a * (1 - eccSquared / 4 - 3 * eccSquared * eccSquared / 64 -
        5 * eccSquared * eccSquared * eccSquared / 256));

  const phi1Rad = mu + (3 * e1 / 2 - 27 * e1 * e1 * e1 / 32) * Math.sin(2 * mu)
          + (21 * e1 * e1 / 16 - 55 * e1 * e1 * e1 * e1 / 32) * Math.sin(4 * mu)
          + (151 * e1 * e1 * e1 / 96) * Math.sin(6 * mu);

  const N1 = a / Math.sqrt(1 - eccSquared * Math.sin(phi1Rad) * Math.sin(phi1Rad));
  const T1 = Math.tan(phi1Rad) * Math.tan(phi1Rad);
  const C1 = eccPrimeSquared * Math.cos(phi1Rad) * Math.cos(phi1Rad);
  const R1 = a * (1 - eccSquared) /
        Math.pow(1 - eccSquared * Math.sin(phi1Rad) * Math.sin(phi1Rad), 1.5);
  const D = x / (N1 * 0.9996);

  let latitude = phi1Rad - (N1 * Math.tan(phi1Rad) / R1) *
          (D * D / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * eccPrimeSquared) * D * D * D * D / 24
          + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * eccPrimeSquared - 3 * C1 * C1) * D * D * D * D * D * D / 720);
  latitude = toDegrees(latitude);

  let longitude = (D - (1 + 2 * T1 + C1) * D * D * D / 6 +
          (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * eccPrimeSquared + 24 * T1 * T1)
          * D * D * D * D * D / 120) / Math.cos(phi1Rad);
  longitude = longitudeOrigin + toDegrees(longitude);

  return { latitude, longitude };
}