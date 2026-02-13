package org.bimrocket.util;

import java.io.UnsupportedEncodingException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

public class URIEncoderTest {

    @Test
    public void testEncodeWithDefaultCharset() {
        // Entrada y salida esperada
        String input = "https://example.com/test?name=John Doe&age=25";
        String expectedOutput = "https://example.com/test?name=John%20Doe&age=25";

        // Ejecutar el método encode
        String result = URIEncoder.encode(input);

        // Verificar que la salida sea la esperada
        assertEquals(expectedOutput, result);
    }

    @Test
    public void testEncodeWithCustomCharset() {
        // Entrada y salida esperada
        String input = "https://example.com/test?name=John Doe&age=25";
        String expectedOutput = "https://example.com/test?name=John%20Doe&age=25";

        // Ejecutar el método encode con un charset diferente
        String result = URIEncoder.encode(input, "UTF-8");

        // Verificar que la salida sea la esperada
        assertEquals(expectedOutput, result);
    }

    @Test
    public void testEncodeWithSpecialCharacters() {
        // Entrada con caracteres especiales
        String input = "https://example.com/test?param=hello world!&code=123/456";
        String expectedOutput = "https://example.com/test?param=hello%20world!&code=123/456";

        // Ejecutar el método encode
        String result = URIEncoder.encode(input);

        // Verificar que la salida sea la esperada
        assertEquals(expectedOutput, result);
    }

   @Test
    public void testEncodeWithUnsupportedCharset() {
        // Entrada con un charset no soportado
        String input = "https://example.com";
        
        // Verificar que se lanza RuntimeException y la causa es UnsupportedEncodingException
        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            URIEncoder.encode(input, "INVALID_CHARSET");
        });
        
        // Verificar que la causa es UnsupportedEncodingException
        assertTrue(exception.getCause() instanceof UnsupportedEncodingException);
    }
}
