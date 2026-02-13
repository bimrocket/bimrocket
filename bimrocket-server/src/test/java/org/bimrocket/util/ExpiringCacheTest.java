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

public class ExpiringCacheTest {

    private ExpiringCache<String> cache;

    @BeforeEach
    public void setUp() {
        // Inicializamos la caché con un tiempo de expiración de 1 segundo (1000ms)
        cache = new ExpiringCache<>(1000);
    }

    @Test
    public void testPutAndGet() {
        cache.put("key1", "value1");
        String value = cache.get("key1");

        assertEquals("value1", value, "El valor almacenado debe ser 'value1'");
    }

    @Test
    public void testGetAfterExpiry() throws InterruptedException {
        cache.put("key2", "value2");

        // Esperar más de 1 segundo para que expire el cache
        TimeUnit.MILLISECONDS.sleep(1100);

        String value = cache.get("key2");

        assertNull(value, "El valor debe ser nulo ya que el elemento ha expirado");
    }

    @Test
    public void testRemove() {
        cache.put("key3", "value3");
        cache.remove("key3");

        String value = cache.get("key3");

        assertNull(value, "El valor debe ser nulo después de eliminarlo");
    }

    @Test
public void testPurgeExpiredItems() throws Exception {
    cache.put("key4", "value4");

    // Esperar a que el item expire
    TimeUnit.MILLISECONDS.sleep(1100);

    // Insertar otro valor para ver si el purgado no afecta a otros elementos
    cache.put("key5", "value5");

    // Usar reflexión para invocar el método 'purge()' aunque es privado
    Method purgeMethod = ExpiringCache.class.getDeclaredMethod("purge");
    purgeMethod.setAccessible(true);
    purgeMethod.invoke(cache);

    String value4 = cache.get("key4");
    String value5 = cache.get("key5");

    assertNull(value4, "El valor 'key4' debe haber expirado y ser purgado");
    assertEquals("value5", value5, "El valor 'key5' debe seguir estando presente");
}

    @Test
    public void testToString() {
        cache.put("key6", "value6");

        String cacheString = cache.toString();

        assertTrue(cacheString.contains("key6"), "La cadena debe contener la clave 'key6'");
    }

    @Test
    public void testMultiplePutAndGet() {
        cache.put("key7", "value7");
        cache.put("key8", "value8");

        assertEquals("value7", cache.get("key7"), "El valor de 'key7' debe ser 'value7'");
        assertEquals("value8", cache.get("key8"), "El valor de 'key8' debe ser 'value8'");
    }
}
