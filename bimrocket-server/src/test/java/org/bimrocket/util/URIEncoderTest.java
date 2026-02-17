package org.bimrocket.util;

import java.io.UnsupportedEncodingException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

public class URIEncoderTest
{

  @Test
  public void testEncodeWithDefaultCharset()
  {
    // Input and output expected
    String input = "https://example.com/test?name=John Doe&age=25";
    String expectedOutput = "https://example.com/test?name=John%20Doe&age=25";

    // Execute encode method
    String result = URIEncoder.encode(input);

    // Verify that is the expected output
    assertEquals(expectedOutput, result);
  }

  @Test
  public void testEncodeWithCustomCharset()
  {
    // Entrada y salida esperada
    String input = "https://example.com/test?name=John Doe&age=25";
    String expectedOutput = "https://example.com/test?name=John%20Doe&age=25";

    // Execute encode method with a diferent charset
    String result = URIEncoder.encode(input, "UTF-8");

    // Verify that is the expected output
    assertEquals(expectedOutput, result);
  }

  @Test
  public void testEncodeWithSpecialCharacters()
  {
    // Input with special characters
    String input = "https://example.com/test?param=hello world!&code=123/456";
    String expectedOutput = "https://example.com/test?param=hello%20world!&code=123/456";

    // Execute encode method
    String result = URIEncoder.encode(input);

    // Verify that is the expected output
    assertEquals(expectedOutput, result);
  }

  @Test
  public void testEncodeWithUnsupportedCharset()
  {
    // Input with a supported charset
    String input = "https://example.com";
        
    // Verify we are throwing RuntimeException and the reason is UnsupportedEncodingException
    RuntimeException exception = assertThrows(RuntimeException.class, () -> {
      URIEncoder.encode(input, "INVALID_CHARSET");
    });
        
    // Verify the reason is UnsupportedEncodingException
    assertTrue(exception.getCause() instanceof UnsupportedEncodingException);
  }
}
