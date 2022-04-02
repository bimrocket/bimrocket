/*
 * BIMROCKET
 *
 * Copyright (C) 2021, Ajuntament de Sant Feliu de Llobregat
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

import jakarta.inject.Inject;
import jakarta.mail.Authenticator;
import jakarta.mail.Message;
import jakarta.mail.MessagingException;
import jakarta.mail.PasswordAuthentication;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import jakarta.servlet.ServletContext;
import java.util.Properties;
import java.util.logging.Level;
import java.util.logging.Logger;
import org.jvnet.hk2.annotations.Service;

/**
 *
 * @author realor
 */
@Service
public class MailService
{
  static final String SMTP_HOST = "mail.smtp.host";
  static final String SMTP_PORT = "mail.smtp.port";
  static final String SMTP_START_TLS = "mail.smtp.starttls.enable";
  static final String SMTP_AUTH = "mail.smtp.auth";
  static final String SMTP_USERNAME = "mail.smtp.username";
  static final String SMTP_PASSWORD = "mail.smtp.password";
  static final String SMTP_FROM = "mail.smtp.from";
  static final String SMTP_CONTENT_TYPE = "mail.smtp.contenttype";

  static final Logger LOGGER =
    Logger.getLogger(MailService.class.getName());

  @Inject
  ServletContext servletContext;

  public boolean isEnabled()
  {
    return servletContext.getInitParameter(SMTP_HOST) != null;
  }

  public boolean sendMail(String from, String to, String subject,
    String body, String contentType)
  {
    Properties props = new Properties();
    props.put(SMTP_HOST, getInitParameter(SMTP_HOST, "localhost"));
    props.put(SMTP_PORT, getInitParameter(SMTP_PORT, "25"));
    props.put(SMTP_START_TLS, getInitParameter(SMTP_START_TLS, "false"));
    props.put(SMTP_AUTH, getInitParameter(SMTP_AUTH, "false"));

    String username = servletContext.getInitParameter(SMTP_USERNAME);
    String password = servletContext.getInitParameter(SMTP_PASSWORD);
    if (from == null)
      from = servletContext.getInitParameter(SMTP_FROM);
    if (contentType == null)
      contentType = servletContext.getInitParameter(SMTP_CONTENT_TYPE);

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

  private String getInitParameter(String name, String defaultValue)
  {
    String value = servletContext.getInitParameter(name);
    return value == null ? defaultValue : value;
  }
}
