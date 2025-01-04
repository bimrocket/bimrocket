/*
 * BIMROCKET
 *
 * Copyright (C) 2021-2025, Ajuntament de Sant Feliu de Llobregat
 *
 * This program is licensed and may be used, modified and redistributed under
 * the terms of the European Public License (EUPL), either version 1.1 or (at
 * your option) any later version as soon as they are approved by the European
 * Commission.
 *
 * Alternatively, you may redistribute and/or modify this program under the
 * terms of the GNU Lesser General Public License as published by the Free
 * Software Foundation; either  version 3 of the License, or (at your option)
 * any later version.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the licenses for the specific language governing permissions, limitations
 * and more details.
 *
 * You should have received a copy of the EUPL1.1 and the LGPLv3 licenses along
 * with this program; if not, you may find them at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 * http://www.gnu.org/licenses/
 * and
 * https://www.gnu.org/licenses/lgpl.txt
 */
package org.bimrocket.service.mail;

import jakarta.annotation.PostConstruct;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.mail.Authenticator;
import jakarta.mail.Message;
import jakarta.mail.MessagingException;
import jakarta.mail.PasswordAuthentication;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import java.util.Properties;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.eclipse.microprofile.config.Config;

/**
 *
 * @author realor
 */
@ApplicationScoped
public class MailService
{
  static final Logger LOGGER =
    Logger.getLogger(MailService.class.getName());

  static final String BASE = "services.mail.";

  static final String SMTP_HOST = "mail.smtp.host";
  static final String SMTP_PORT = "mail.smtp.port";
  static final String SMTP_START_TLS = "mail.smtp.starttls.enable";
  static final String SMTP_AUTH = "mail.smtp.auth";

  @Inject
  Config config;

  @PostConstruct
  public void init()
  {
    LOGGER.log(Level.INFO, "Init MailService");

    LOGGER.log(Level.INFO, "MailService enabled: {0}", isEnabled());
  }

  public boolean isEnabled()
  {
    return config.getValue(BASE + "enabled", Boolean.class);
  }

  public boolean sendMail(String from, String to, String subject,
    String body, String contentType)
  {
    Properties props = new Properties();
    props.put(SMTP_HOST, config.getValue(BASE + "host", String.class));
    props.put(SMTP_PORT, config.getValue(BASE + "port", String.class));
    props.put(SMTP_START_TLS, config.getValue(BASE + "startTls", String.class));
    props.put(SMTP_AUTH, config.getValue(BASE + "auth", String.class));

    String username = config.getValue(BASE + "username", String.class);
    String password = config.getValue(BASE + "password", String.class);

    if (from == null)
      from = config.getValue(BASE + "from", String.class);

    if (contentType == null)
      contentType = config.getValue(BASE + "contentType", String.class);

    try
    {
      Session session = Session.getInstance(props, new Authenticator()
      {
        @Override
        protected PasswordAuthentication getPasswordAuthentication()
        {
          return new PasswordAuthentication(username, password);
        }
      });

      MimeMessage message = new MimeMessage(session);

      message.setFrom(new InternetAddress(from));

      message.setRecipients(Message.RecipientType.TO,
        InternetAddress.parse(to));

      message.setSubject(subject);

      message.setContent(body, contentType);

      //send the email message
      Transport.send(message);

      LOGGER.log(Level.INFO, "Message sent to {0} with subject [{1}]",
        new Object[]{to, subject});

      return true;
    }
    catch (MessagingException ex)
    {
      LOGGER.log(Level.SEVERE, null, ex);

      return false;
    }
  }

  public void asyncSendMail(String from, String to, String subject,
    String body, String contentType)
  {
    Thread thread = new Thread(() ->
    {
      sendMail(from, to, subject, body, contentType);
    });
    thread.start();
  }
}
