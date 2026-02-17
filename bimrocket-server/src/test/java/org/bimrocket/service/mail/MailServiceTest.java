package org.bimrocket.service.mail;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import java.lang.reflect.Field;

import org.eclipse.microprofile.config.Config;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class MailServiceTest
{
  private Config config;
  private MailService mailService;

  @BeforeEach
  void setUp() throws Exception
  {
    config = mock(Config.class);
    mailService = new MailService();
    Field field = MailService.class.getDeclaredField("config");
    field.setAccessible(true);
    field.set(mailService, config);
  }

  @Test
  void testIsEnabled_true()
  {
    when(config.getValue("services.mail.enabled", Boolean.class))
      .thenReturn(true);
    assertTrue(mailService.isEnabled());
  }

  @Test
  void testIsEnabled_false()
  {
    when(config.getValue("services.mail.enabled", Boolean.class))
      .thenReturn(false);
    assertFalse(mailService.isEnabled());
  }

  @Test
  void testSendMail_serviceDisabled_throwsException()
  {
    when(config.getValue("services.mail.enabled", Boolean.class))
      .thenReturn(false);
    assertThrows(NullPointerException.class, () ->
      mailService.sendMail(
              "from@test.com",
              "to@test.com",
              "Subject",
              "Body",
              "text/plain"
      )
    );
  }

  @Test
  void testSendMail_missingRequiredConfig_throwsException()
  {
    when(config.getValue("services.mail.enabled", Boolean.class))
      .thenReturn(true);
    when(config.getValue("services.mail.host", String.class))
      .thenThrow(new IllegalStateException("Missing config"));
    assertThrows(IllegalStateException.class, () ->
      mailService.sendMail(
              "from@test.com",
              "to@test.com",
              "Subject",
              "Body",
              "text/plain"
      )
    );
  }
}
