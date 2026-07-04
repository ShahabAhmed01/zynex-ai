# Zynex AI Website Redesign Design Spec

## [S1] Architecture Overview

### Current State
- Single HTML file with inline CSS (~810 lines)
- Separate app.js (635 lines), animations.js (208 lines), unused style.css (625 lines)
- All CSS is inlined in index.html
- No build step, no module system

### Proposed Architecture
- **Separate CSS files** organized by BEM methodology:
  - `css/base.css` - Reset, typography, CSS variables
  - `css/layout.css` - Grid, flexbox, responsive structure
  - `css/components.css` - Button, input, card, modal styles
  - `css/chat.css` - Chat interface specific styles
  - `css/animations.css` - All animations and transitions
- **Modular JavaScript** with ES6 modules:
  - `js/app.js` - Main application controller
  - `js/chat.js` - Chat functionality
  - `js/streaming.js` - SSE streaming handler
  - `js/markdown.js` - Markdown renderer
  - `js/storage.js` - localStorage management
  - `js/ui.js` - UI utilities and DOM manipulation
- **Clean HTML structure** with semantic markup
- **No build step required** - native ES6 modules

### Benefits
- Maintainable, scalable, professional codebase
- Easy to modify individual components
- Clear separation of concerns
- Professional development practices

## [S2] Visual Design System

### Color Palette (Cool Blues with Warm Approachable feel)
- **Primary:** `#4A90D9` (Soft Blue) - Trust, reliability
- **Secondary:** `#6BB5FF` (Light Blue) - Accent, highlights
- **Background:** `#F8FAFE` (Very Light Blue) - Clean, airy feel
- **Surface:** `#FFFFFF` (White) - Cards, modals
- **Text Primary:** `#1A2B4A` (Dark Navy) - Readable, professional
- **Text Secondary:** `#5A6B8A` (Muted Blue) - Supporting text
- **Success:** `#4CAF50` (Green) - Positive actions
- **Warning:** `#FFC107` (Amber) - Caution states
- **Error:** `#F44336` (Red) - Error states

### Typography (Inter)
- **Headings:** Inter Bold (700) - Clear hierarchy
- **Body:** Inter Regular (400) - Readable, friendly
- **Code:** JetBrains Mono - Technical content
- **Scale:** 14px base, 1.5 line-height

### Spacing System
- **Base unit:** 8px
- **Scale:** 8, 16, 24, 32, 48, 64, 96

### Border Radius
- **Small:** 6px (buttons, inputs)
- **Medium:** 12px (cards, modals)
- **Large:** 16px (containers)

### Shadows
- **Subtle:** `0 1px 3px rgba(0,0,0,0.08)`
- **Medium:** `0 4px 12px rgba(0,0,0,0.12)`
- **Large:** `0 8px 24px rgba(0,0,0,0.16)`

### Design Principles
1. **Warm & Approachable** - Soft colors, rounded corners, friendly typography
2. **Clean & Focused** - Generous whitespace, clear hierarchy
3. **Professional** - Consistent spacing, purposeful animations
4. **Accessible** - High contrast, readable fonts, clear focus states

## [S3] Layout & Components

### Sidebar (280px width)
- **Header:** Logo + New Chat button
- **Conversation List:** Scrollable, grouped by date
- **Each conversation:** Title, timestamp, delete button on hover
- **Footer:** Settings, API Configuration, User info

### Main Chat Area
- **Header:** Hamburger toggle, conversation title, model selector, clear chat
- **Welcome Screen:** Centered greeting with 4 suggestion cards
- **Message Area:** Scrollable chat with user/AI messages
- **Input Area:** Auto-resizing textarea, send button, keyboard shortcut hint

### Message Components
- **User Message:** Right-aligned, primary color background, white text
- **AI Message:** Left-aligned, surface color background, primary text
- **Code Blocks:** Syntax highlighted, copy button, line numbers
- **Markdown:** Rich formatting with proper spacing
- **Streaming Indicator:** Typing dots animation

### Modals
- **Settings Modal:** API configuration, model selection
- **Export Modal:** PDF, slides, DOCX download options

### Responsive Design
- **Desktop:** Sidebar + Main chat (flexible width)
- **Tablet:** Collapsible sidebar, full-width chat
- **Mobile:** Overlay sidebar, optimized touch targets

### Micro-Interactions
- **Buttons:** Scale on hover, subtle shadow change
- **Inputs:** Border color transition on focus
- **Cards:** Gentle lift on hover
- **Messages:** Fade-in animation on appear

## [S4] Animations & Interactions

### Page Transitions
- **Sidebar Toggle:** Smooth slide-in/out with backdrop fade
- **Modal Open/Close:** Scale + fade with backdrop blur
- **View Changes:** Cross-fade between welcome screen and chat

### Message Animations
- **New Message:** Fade-in from bottom with subtle slide-up
- **Streaming Text:** Character-by-character appearance with cursor blink
- **Typing Indicator:** Three dots with staggered bounce animation

### Micro-Interactions
- **Button Hover:** Scale(1.02) + shadow elevation change (200ms ease)
- **Input Focus:** Border color transition + subtle glow
- **Card Hover:** TranslateY(-2px) + shadow increase
- **Delete Button:** Fade-in on conversation hover

### Loading States
- **Skeleton Loading:** Pulse animation for content placeholders
- **Progress Bar:** Gradient animation for streaming progress
- **Spinner:** Rotating circle with brand color

### Scroll Animations
- **New Messages:** Smooth scroll to bottom with easing
- **Sidebar:** Custom scrollbar with brand colors

### Performance Considerations
- **GPU Acceleration:** Use transform and opacity for animations
- **Will-change:** Apply sparingly for complex animations
- **RequestAnimationFrame:** For smooth 60fps animations
- **Reduced Motion:** Respect prefers-reduced-motion media query

### Animation Timing
- **Fast:** 150ms (hover states)
- **Normal:** 250ms (transitions)
- **Slow:** 400ms (page transitions)
- **Easing:** cubic-bezier(0.4, 0, 0.2, 1) for smooth feel

## [S5] Mobile Experience

### Breakpoints
- **Mobile:** < 768px
- **Tablet:** 768px - 1024px
- **Desktop:** > 1024px

### Mobile Layout (< 768px)
- **Sidebar:** Full-screen overlay with slide-in animation
- **Header:** Hamburger menu, conversation title, model selector
- **Chat Area:** Full-width, optimized for touch
- **Input Area:** Fixed bottom, safe area padding
- **Touch Targets:** Minimum 44px for all interactive elements

### Mobile Navigation
- **Swipe Gesture:** Swipe right to open sidebar
- **Tap Outside:** Close sidebar overlay
- **Back Button:** Return to conversation list

### Mobile Input
- **Auto-resize:** Textarea grows with content
- **Keyboard Handling:** Adjust layout when keyboard appears
- **Send Button:** Large, accessible, right-aligned

### Mobile Chat
- **Messages:** Full-width, optimized spacing
- **Code Blocks:** Horizontal scroll with touch
- **Images:** Responsive sizing, tap to expand

### Mobile Performance
- **Lazy Loading:** Load messages as needed
- **Virtual Scrolling:** For long conversations
- **Touch Optimization:** Prevent 300ms tap delay

### Progressive Enhancement
- **Core Functionality:** Works without JavaScript
- **Enhanced Experience:** JavaScript adds streaming, animations
- **Offline Support:** Cache recent conversations

### Accessibility on Mobile
- **Screen Reader:** Proper ARIA labels
- **Voice Control:** Compatible with voice assistants
- **High Contrast:** Support for system settings

## [S6] Docker & Deployment

### Production Dockerfile
- **Base Image:** `python:3.11-slim-bookworm`
- **Multi-stage Build:** Separate build and runtime stages
- **Optimization:**
  - Layer caching for dependencies
  - Remove dev dependencies in production
  - Compress static assets
- **Health Checks:** Built-in endpoint monitoring
- **Security:** Non-root user, minimal attack surface

### Docker Configuration
- **Environment Variables:** Configurable via .env
- **Port Mapping:** 8000:8000 (configurable)
- **Volume Mounts:** Optional for development
- **Network:** Bridge network for multi-service

### Build Process
- **Development:** `docker build -t zynex-ai .`
- **Production:** `docker build --target production -t zynex-ai:latest .`
- **Optimized:** `docker build --target optimized -t zynex-ai:optimized .`

### Deployment Options
- **Local Development:** `docker run -p 8000:8000 zynex-ai`
- **Production:** `docker run -d -p 8000:8000 --name zynex-ai zynex-ai:latest`
- **Docker Compose:** Optional for multi-service setup

### GitHub Integration
- **Push to Main:** Direct deployment to production
- **CI/CD:** GitHub Actions for automated testing
- **Versioning:** Semantic versioning with tags

### Performance Optimizations
- **Static Assets:** Compressed and cached
- **Gzip:** Enabled for all responses
- **CDN:** Ready for external CDN integration