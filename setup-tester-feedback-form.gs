/**
 * Learning Japanese - internal tester feedback form
 *
 * HOW TO USE
 * 1. Go to https://script.google.com  ->  New project
 * 2. Delete the placeholder "Code.gs" contents and paste this whole file in
 * 3. Click Run -> choose "buildFeedbackForm" -> Allow permissions
 * 4. Open the Executions log (bottom left) for the Form and response-sheet links
 * 5. In the Form UI, open the Responses tab and click "Link Sheets" so every
 *    response is also collected in a spreadsheet
 *
 * Running it twice is safe: it reuses the Form it made the first time.
 */

var FORM_TITLE = 'Learning Japanese - Tester Feedback';
var STATE_KEY = 'feedbackFormId';
var EMAIL_KEY = 'feedbackEmail';

var DESCRIPTION = [
  'Thanks for helping test Learning Japanese.',
  '',
  'This build is 0.7.5 (versionCode 12). The app teaches hiragana, katakana and',
  'kanji entirely offline: no account, no ads, and it requests no Android',
  'permissions at all. If no permission prompt appears, that is correct behaviour.',
  '',
  'The app ships no analytics or crash reporting, so this form is the only way I',
  'hear from you. More detail means faster fixes. Please fill it in on the device',
  'you actually tested.'
].join('\n');

var KNOWN_ISSUES = [
  'KNOWN ISSUES - these are not bugs, please do not report them:',
  '1. On devices whose Android WebView is older than Chromium 140, a thin light',
  '   strip can appear above the top bar in dark mode. The app still works; this',
  '   is a platform fallback.',
  '2. If a bundled pronunciation clip is missing, the app falls back to your',
  '   device Japanese text-to-speech voice. A slightly different voice is expected.',
  '3. There is no automatic crash reporting, by design.'
].join('\n');


function buildFeedbackForm() {
  var state = PropertiesService.getScriptProperties();
  var existingId = state.getProperty(STATE_KEY);
  if (existingId) {
    try {
      var reopened = FormApp.openById(existingId);
      logLinks(reopened);
      return;
    } catch (err) {
      state.deleteProperty(STATE_KEY);
    }
  }

  var form = FormApp.create(FORM_TITLE);
  form.setDescription(DESCRIPTION);
  form.setConfirmationMessage(
    'Thank you. Your feedback has been sent to the developer and will go into the ' +
    'next build. If you found something serious, you can install a newer build from ' +
    'the same Play internal testing link.'
  );
  form.setAcceptingResponses(true);

  text(form, 'Your device', 'Device model', true,
      'For example: Pixel 7a, Galaxy S23, Galaxy Tab S9');
  text(form, null, 'Android version', true,
      'Settings -> About phone -> Android version');
  text(form, null, 'App version', false,
      'Settings -> Apps -> Learning Japanese. Leave blank if you cannot find it.');
  choice(form, null, 'Device type', true, ['Phone', 'Tablet', 'Foldable', 'Other']);
  text(form, null, 'Chrome / Android WebView version', false,
      'Chrome -> three dots -> About Chrome. Only if you know it; blank is fine.');

  boxes(form, 'What you tested', 'Which areas did you try?', true, [
    'First run and navigation',
    'Quiz',
    'Kana chart',
    'Kanji chart',
    'Statistics',
    'Settings',
    'Offline (airplane mode)',
    'Large font size / accessibility'
  ]);
  choice(form, null, 'How much did you use the app?', false, [
    'Just looked around',
    'A few minutes',
    '15+ minutes',
    '30+ minutes',
    'Multiple sessions'
  ]);

  choice(form, 'Overall verdict', 'How useful is this for learning Japanese?', true,
      ['1 - Not useful', '2', '3', '4', '5 - Very useful']);
  choice(form, null, 'How easy was it to get started?', true,
      ['1 - Very hard', '2', '3', '4', '5 - Very easy']);
  choice(form, null, 'Would you keep using it?', true, ['Yes', 'Maybe', 'No']);

  choice(form, 'Bugs and crashes', 'Did you find any bugs, crashes or wrong content?', true,
      ['No', 'Yes']);
  text(form, null, 'Summary in one line', false, 'Short version of the problem.');
  paragraph(form, null, 'What I did', false, 'The steps, numbered from 1.');
  paragraph(form, null, 'What I expected', false, null);
  paragraph(form, null, 'What actually happened', false,
      'Include any error message or what you saw instead.');
  choice(form, null, 'How often did it happen?', false,
      ['Every time', 'Sometimes', 'Only once']);
  paragraph(form, null, 'Screenshot or screen recording link', false,
      'Optional. Upload it to Drive, set sharing to "anyone with the link", and paste ' +
      'the link here. A screenshot speeds up fixes a lot.');

  paragraph(form, 'Improvements', 'Did anything feel slow, confusing or wrong?', false, null);
  paragraph(form, null, 'One thing to fix or add first', false, null);
  paragraph(form, null, 'Anything else at all', false, null);

  form.addSectionHeaderItem()
      .setTitle('Before you submit')
      .setHelpText(KNOWN_ISSUES);
  boxes(form, null, 'Please confirm', true, [
    'Yes, I have read the known issues above and understand they are not bugs'
  ]);

  state.setProperty(STATE_KEY, form.getId());
  var owner = Session.getEffectiveUser().getEmail();
  if (owner) state.setProperty(EMAIL_KEY, owner);
  installNotifyTrigger(form);
  logLinks(form);
}


function notificationEmail() {
  var stored = PropertiesService.getScriptProperties().getProperty(EMAIL_KEY);
  if (stored) return stored;
  return Session.getEffectiveUser().getEmail();
}


function logLinks(form) {
  Logger.log('Form edit link:  ' + form.getEditUrl());
  Logger.log('Live link:       ' + form.getPublishedUrl());
  var dest = form.getDestinationId();
  Logger.log(dest
      ? 'Response sheet:  ' + dest
      : 'Response sheet:  none yet - link one in the form UI (Responses tab)');
  Logger.log('Email goes to:   ' + (notificationEmail() || 'UNKNOWN - re-run build'));
}


function installNotifyTrigger(form) {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'onFormSubmit') return;
  }
  ScriptApp.newTrigger('onFormSubmit').forForm(form).onFormSubmit().create();
}


function onFormSubmit(e) {
  if (!e || !e.response) return;

  var to = notificationEmail();
  if (!to) {
    Logger.log('ERROR: no notification address. Re-run buildFeedbackForm.');
    return;
  }

  var lines = ['A tester submitted the Learning Japanese feedback form.', ''];
  var items = e.response.getItemResponses();
  for (var i = 0; i < items.length; i++) {
    var answer = describeAnswer(items[i]);
    if (!answer) continue;
    lines.push('* ' + items[i].getItem().getTitle());
    lines.push('    ' + answer);
    lines.push('');
  }

  MailApp.sendEmail({
    to: to,
    subject: 'Learning Japanese - new tester feedback',
    body: lines.join('\n')
  });
}


function describeAnswer(itemResponse) {
  var raw = itemResponse.getResponse();
  if (raw === null || raw === undefined || raw === '') return '';
  if (Object.prototype.toString.call(raw) === '[object Array]') return raw.join(', ');
  if (typeof raw === 'object') return '(file attached)';
  return String(raw);
}


function section(form, name) {
  if (name) form.addSectionHeaderItem().setTitle(name);
}


function text(form, sectionName, title, required, help) {
  section(form, sectionName);
  var item = form.addTextItem();
  item.setTitle(title);
  item.setRequired(required);
  if (help) item.setHelpText(help);
  return item;
}

function paragraph(form, sectionName, title, required, help) {
  section(form, sectionName);
  var item = form.addParagraphTextItem();
  item.setTitle(title);
  item.setRequired(required);
  if (help) item.setHelpText(help);
  return item;
}

function choice(form, sectionName, title, required, options) {
  section(form, sectionName);
  var item = form.addMultipleChoiceItem();
  item.setTitle(title);
  item.setChoices(options);
  item.setRequired(required);
  return item;
}

function boxes(form, sectionName, title, required, options) {
  section(form, sectionName);
  var item = form.addCheckboxItem();
  item.setTitle(title);
  item.setChoices(options);
  item.setRequired(required);
  return item;
}
