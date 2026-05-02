# School Prep Assistant User Guide

This guide is for:

- Parents who set up and update the app
- Students who use the app for daily practice

## 1. System Overview

The app is a local learning system. Right now it opens directly into math practice, and it helps a student read a tutorial, take concept tests, review mistakes, and track progress over time.

How it works:

- The app runs in a web browser
- The built app is served from the repo `dist/` output
- Lessons, tutorials, and tests come from `public/content/`
- Student progress is saved in the browser using IndexedDB
- The app can also use Firebase as a sync/recovery layer, but local storage remains primary

Important:

- `dist/` contains the built web app
- `public/content/` contains manifests, tutorials, and test files
- Progress is stored in the browser, not inside the content files

## 2. Parent Flow

### 2.1 First-Time Setup on Child Computer

1. Install Node.js on the child computer.
2. Open Terminal once and install the local web server:

```bash
npm install -g serve
```

3. Copy the full project folder to the child computer, including:
   - `dist/`
   - `public/content/`
   - `Open Math Practice.command`
4. Place `Open Math Practice.command` somewhere easy to find, such as the Desktop.
5. Double-click `Open Math Practice.command`.

Expected result:

- A browser window opens automatically
- The School Prep Assistant app appears
- The student can choose a concept and begin

If the app does not open:

- Check that Node.js is installed
- Check that `serve` was installed successfully
- Double-click the launcher again
- If macOS shows a security warning, allow the script to run from System Settings if needed

### 2.2 Daily Usage (Parent Perspective)

- No daily setup is needed after the first-time install
- The child only needs to double-click `Open Math Practice.command`
- Parent help is optional unless there is a problem or a new update to install

### 2.3 Delivering New Concept Tests

To add more practice without changing the app itself:

1. Generate new test JSON files
2. Place them in:
   - `public/content/math/course2/test-sets/`
3. Update the relevant manifest file so the new test sets are listed
4. Rebuild if needed and copy the updated project folder to the child computer
5. Replace the existing `public/content/` files with the new ones

Important:

- Do **not** modify `dist/` for content-only updates
- Do **not** delete browser data
- Do **not** clear site storage in the browser

### 2.4 Delivering Bug Fixes / App Updates

When the app code changes:

1. Rebuild the app:

```bash
npm run build
```

2. Replace only:
   - `dist/`
3. Keep the existing:
   - `public/content/`
4. Do **not** clear browser data

Important:

- Student progress is stored in the browser
- Replacing `app/` should not remove progress
- Deleting browser data can remove saved attempts and progress

### 2.5 Adding New Concepts

To add a new concept:

1. Add the concept to the manifest
2. Add its tutorial markdown file
3. Add one or more test-set JSON files
4. Copy the updated `public/content/` files to the child computer

The app will detect the new concept automatically and show it in the course roadmap.

### 2.6 Adding New Courses

To add a new course:

1. Create a new course manifest file
2. Add tutorial files for its concepts
3. Add test-set files for its concepts
4. Place everything under `content/`

The app is built to detect course manifests from the content layer, so new courses can be added without changing the student workflow.

### 2.7 Backup and Restore Progress

Use the app's built-in progress tools.

To back up progress:

1. Open the app
2. Go to the Progress page
3. Use `Download Progress`
4. Save the JSON file somewhere safe

To restore progress:

1. Open the app
2. Go to the Progress page
3. Use `Upload Progress`
4. Choose the saved JSON backup file
5. Confirm the import

Important:

- Always create a backup before major updates
- Keep at least one recent backup file

### 2.8 Safe Update Rules

Follow these rules every time:

- Never delete browser data
- Never clear site storage unless you intend to erase progress
- Never modify IndexedDB manually
- Always test updates on your own machine before sending them to the child computer
- Always replace `public/content/` carefully for content updates
- Always replace only `dist/` for app-code updates
- Always create a progress backup before a major update

## 3. Student Flow

### 3.1 Starting the App

- Double-click `Open Math Practice.command`
- Wait for the app to open in the browser

### 3.2 How to Use the App

1. Choose a concept
2. Read the tutorial if you want help first
3. Start a test
4. Answer the questions
5. Click `Submit`
6. Review the questions you missed

### 3.3 What to Do When You Get Questions Wrong

- Read the explanation
- Look at what the correct answer was
- Try to understand the mistake
- Take the test again if needed

Getting questions wrong is part of learning. The review page is there to help you improve.

### 3.4 Progress Tracking

The app keeps track of:

- Your attempts
- Your best score
- Concepts you have started
- Concepts you have mastered

This means you can come back later and keep building from where you left off.

### 3.5 What to Do If Something Doesn’t Work

- Close the app window
- Start it again using the launcher
- If it still does not work, ask a parent for help

## 4. Troubleshooting

### App does not open

- Make sure Node.js is installed
- Make sure `serve` is installed
- Try running the launcher again
- Make sure Google Chrome is installed if you want it to open in Chrome app mode

### Blank screen

- Close the browser window
- Run `Open Math Practice.command` again
- If the problem continues, replace `dist/` with a fresh copy

### Content is missing

- Check that `public/content/manifest/` exists
- Check that the needed tutorial and test files exist in `public/content/`
- Make sure the manifest paths match the real filenames

### Progress seems missing

- Do not clear browser history or site data
- Check whether the student is opening the app in the same browser profile as before
- If needed, restore progress from an exported backup

## 5. System Design

The system has three simple parts:

- App layer:
  - The student interface in `dist/`
- Content layer:
  - JSON manifests, test sets, and markdown tutorials in `public/content/`
- Storage layer:
  - IndexedDB in the browser for sessions, attempts, and progress

This design makes it easier to:

- add new concepts
- add new courses
- update content without rebuilding the whole app
- update the app without deleting student progress
