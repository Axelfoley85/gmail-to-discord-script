// This script is triggered every ten minutes. So each iteration, it checks
// for messages of the past 10 minutes.

// How this works:
// 1. get all threads from the last 7 days
// (dont remember why 7 days, possibly easier debugging or weird google time
// stuff, I recommend not changing it)
// 2. get all messages from the threads
// 3. check if a message is 10 minutes old or newer
// 4. if so send to discord

// eslint-disable-next-line no-unused-vars
function sendMailsToDiscord () {
  const checkSpan = 10 // minutes intervall to post e-mails from, needs same setting as in Triggers!!!
  const MILLIS_PER_10_MINUTES = 1000 * 60 * checkSpan
  const MILLIS_PER_7_DAYS = 1000 * 60 * 60 * 24 * 7

  const searchQuery = getSearchQuery(MILLIS_PER_7_DAYS)

  parseEmails(searchQuery, MILLIS_PER_10_MINUTES)
}

// get all threads with activity in the last 7 days
function parseEmails (searchQuery, MILLIS_PER_10_MINUTES) {
  const threads = GmailApp.search(searchQuery, 0, 50)
  const msgs = GmailApp.getMessagesForThreads(threads)

  for (let i = 0; i < msgs.length; i++) {
    const lastMsgDt = threads[i].getLastMessageDate()

    const tenMinutesAgo = getDateMilliSecondsAgo(MILLIS_PER_10_MINUTES)
    const lastMessageTime = lastMsgDt.getTime()

    // if last message in thread is older than 10 minutes, skip this thread
    if (lastMessageTime < tenMinutesAgo) {
      break
    }

    // parse through messages in thread and filter out messages older than 10 minutes
    for (let j = 0; j < msgs[i].length; j++) {
      const msg = msgs[i][j]
      const messageTime = msg.getDate().getTime()
      console.log(
        'valid thread #' + i + ', message #' + j + '; ' +
        'epoch timestamp (ms): ' + messageTime + '; Calculated date: ' +
        Utilities.formatDate(msg.getDate(), 'Europe/Berlin', 'dd.MM.yyyy HH:mm:ss')
      )

      // skip messages older than 10 minutes
      if (messageTime >= tenMinutesAgo) {
        emailToDiscordMessage(msg)
      }

    }
  }
}

function emailToDiscordMessage (msg) {
  const msgDate = msg.getDate()
  const sender = msg.getFrom()
  const msgBody = msg.getPlainBody()
  const subject = msg.getSubject()

  let postMsg = '<@&1073594761774120980>\n**E-Mail for my-example-mail@gmail.com**' + '\n' +
    'If you want to reply to this message please use our common mail account. ' +
    'Credentials are provided in the general admin channel.\n\n' +
    Utilities.formatDate(msgDate, 'Europe/Berlin', 'dd.MM.yyyy HH:mm:ss') + '\n' +
    'From: ' + sender + '\n' +
    '**Subject: ' + subject + '**\n\n' +
    msgBody

  postMsg = sanitizeMessageLength(postMsg)
  postDiscord(postMsg)
}

function sanitizeMessageLength (postMsg) {
  console.log(`chars: ${postMsg.length}`)
  // The limit is 2000 characters
  if (postMsg.length > 2000) {
    const stopPos = 1900 //
    const msg = '`This message is longer than 2000 chars and was shortened.`'
    postMsg = postMsg.substring(0, stopPos) + '\n' + msg
  }
  console.log(postMsg)
  console.log('===================================')
  console.log(`chars: ${postMsg.length}`)
  console.log('===================================')

  return postMsg
}

function postDiscord (postMsg) {
  const props = PropertiesService.getScriptProperties()
  const webhook = props.getProperty('WEBHOOK') // get value from project properties

  const options = {
    method: 'post',
    payload: JSON.stringify({ content: postMsg }),
    contentType: 'application/json',
    muteHttpExceptions: true
  }

  console.log(webhook, options)

  const response = UrlFetchApp.fetch(webhook, options)
  if (response.toString()) {
    console.error(response.toString())
  }
}

function getSearchQuery (MILLIS_PER_7_DAYS) {
  const dateWeekAgo = getDateMilliSecondsAgo(MILLIS_PER_7_DAYS)

  const minDate = Utilities.formatDate(dateWeekAgo, 'Europe/Berlin', 'yyyy/MM/dd')

  // OLD QUERY: const searchQuery = 'in:all after:' + minDate  
  // NEW QUERY excluding "script failure notifications" and "drafts"
  const searchQuery = 'in:all -{in:drafts subject:"Summary of failures for Google Apps Script"} after:' + minDate

  console.log('searchQuery: ' + searchQuery)

  return searchQuery
}

// format a date to "milliseconds ago"/epoch timestamp
function getDateMilliSecondsAgo (milliSeconds) {
  const now = new Date()
  const date = new Date(now.getTime() - milliSeconds)

  console.log(
    'ms: ' + milliSeconds + '; Calculated date: ' +
    Utilities.formatDate(date, 'Europe/Berlin', 'yyyy.MM.dd HH:mm:ss')
  )

  return date
}
