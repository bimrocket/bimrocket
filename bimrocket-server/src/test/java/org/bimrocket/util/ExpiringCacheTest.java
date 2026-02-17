/*
testPutAndGet: Se prueba que un valor insertado en la caché se puede recuperar correctamente.
testGetAfterExpiry: Se prueba que un valor expira después del tiempo de expiración y no se puede recuperar.
testRemove: Se prueba que un valor puede ser eliminado de la caché.
testPurgeExpiredItems: Se prueba la purga de elementos caducados de la caché y que no afecte a elementos válidos.
testToString: Se prueba que el método toString funciona y devuelve la información correcta de la caché.
testMultiplePutAndGet: Se prueba que varios elementos puedan ser insertados y recuperados correctamente.
*/

package org.bimrocket.util;

import java.lang.reflect.Method;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

public class ExpiringCacheTest
{

  private ExpiringCache<String> cache;

  @BeforeEach
  public void setUp()
  {
    // Initialize caché with a 1 second of expiration time (1000ms)
    cache = new ExpiringCache<>(1000);
  }

  @Test
  public void testPutAndGet()
  {
    cache.put("key1", "value1");
    String value = cache.get("key1");

    assertEquals("value1", value, "Stored value must be 'value1'");
  }

  @Test
  public void testGetAfterExpiry() throws InterruptedException
  {
    cache.put("key2", "value2");

    // Wait more than 1 second until cache expiration
    TimeUnit.MILLISECONDS.sleep(1100);

    String value = cache.get("key2");

    assertNull(value, "Value must be null because element has expired");
  }

  @Test
  public void testRemove()
  {
    cache.put("key3", "value3");
    cache.remove("key3");

    String value = cache.get("key3");

    assertNull(value, "Value must be null after to be removed");
  }

  @Test
  public void testPurgeExpiredItems() throws Exception
  {
    cache.put("key4", "value4");

    // Wait until item expires
    TimeUnit.MILLISECONDS.sleep(1100);

    // Insert another value to see if the purged value afect other elements
    cache.put("key5", "value5");

    // Use reflection to call 'purge()' method even is private
    Method purgeMethod = ExpiringCache.class.getDeclaredMethod("purge");
    purgeMethod.setAccessible(true);
    purgeMethod.invoke(cache);

    String value4 = cache.get("key4");
    String value5 = cache.get("key5");

    assertNull(value4, "Value 'key4' must be expired and purged");
    assertEquals("value5", value5, "Value 'key5' must persist");
  }

  @Test
  public void testToString()
  {
    cache.put("key6", "value6");

    String cacheString = cache.toString();

    assertTrue(cacheString.contains("key6"), "Chain must contain key 'key6'");
  }

  @Test
  public void testMultiplePutAndGet()
  {
    cache.put("key7", "value7");
    cache.put("key8", "value8");

    assertEquals("value7", cache.get("key7"), "Value 'key7' must be 'value7'");
    assertEquals("value8", cache.get("key8"), "Value 'key8' must be 'value8'");
  }
}
