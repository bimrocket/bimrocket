/*
testGetISODate_WithoutParameters(): Este test verifica que el método getISODate() sin parámetros devuelve la fecha en el formato ISO esperado, usando la fecha y hora actual.

Utilizamos SimpleDateFormat para formatear la fecha actual y comparamos el resultado con la salida del método.
testGetISODate_WithDateParameter(): Este test verifica que el método getISODate(Date date) funcione correctamente cuando se le pase una fecha específica.

Se crea un objeto Date con un valor fijo de milisegundos (en este caso, 1000000000000L), luego se compara el resultado con el formato ISO de esa fecha.
*/

package org.bimrocket.util;

import java.text.SimpleDateFormat;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.assertEquals;
import org.junit.jupiter.api.Test;

public class TextUtilsTest
{

  @Test
  public void testGetISODate_WithoutParameters()
  {
    // Because current data can change, create one date with a known formato to be comnpared
    String result = TextUtils.getISODate();

    // Get current date
    SimpleDateFormat df = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss");
    String expected = df.format(new Date());

    assertEquals(expected, result, "Datre format must be correct.");
  }

  @Test
  public void testGetISODate_WithDateParameter()
  {
    // Use a known date to ensure that conversion is correct
    Date date = new Date(1000000000000L); // Date example in miliseconds
    String result = TextUtils.getISODate(date);

    SimpleDateFormat df = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss");
    String expected = df.format(date);

    assertEquals(expected, result, "Date formar must be correct.");
  }
}
