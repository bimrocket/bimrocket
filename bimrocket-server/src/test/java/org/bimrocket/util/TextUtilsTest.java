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

public class TextUtilsTest {

    @Test
    public void testGetISODate_WithoutParameters() {
        // Dado que la fecha actual puede variar, creamos una fecha con un formato conocido para comparación
        String result = TextUtils.getISODate();

        // Obtención de la fecha actual
        SimpleDateFormat df = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss");
        String expected = df.format(new Date());

        assertEquals(expected, result, "El formato de la fecha debe ser correcto.");
    }

    @Test
    public void testGetISODate_WithDateParameter() {
        // Usamos una fecha conocida para asegurar que la conversión sea la esperada
        Date date = new Date(1000000000000L); // Un ejemplo de fecha en milisegundos
        String result = TextUtils.getISODate(date);

        SimpleDateFormat df = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss");
        String expected = df.format(date);

        assertEquals(expected, result, "El formato de la fecha debe ser correcto.");
    }
}
