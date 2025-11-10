# Loading Utilities Guide

## Overview
`loading-utils.js` provides reusable loading states, skeleton loaders, and empty/error states for Sirius Jobs dashboards.

## Installation

Add to your HTML file:
```html
<script src="loading-utils.js"></script>
```

## Usage Examples

### 1. Skeleton Loaders

Show skeleton loaders while data is being fetched:

```javascript
// Show card skeleton
SiriusLoading.showSkeleton('#jobsContainer', 'card', 5);

// Show list skeleton
SiriusLoading.showSkeleton('#workersContainer', 'list', 3);

// Show table skeleton
SiriusLoading.showSkeleton('#ordersTable tbody', 'table', 10);
```

**Skeleton Types:**
- `card` - Card-style skeleton with title, text, and buttons
- `list` - List item with avatar and text
- `table` - Table row skeleton
- `text` - Simple text lines

### 2. Loading Spinner

Show a simple spinner with message:

```javascript
SiriusLoading.showSpinner('#dashboard', 'Loading your jobs...');
```

### 3. Empty State

Show when no data is available:

```javascript
SiriusLoading.showEmptyState('#jobsContainer', {
  icon: 'briefcase',
  title: 'No jobs posted yet',
  message: 'Post your first job to start receiving applications.',
  actionText: 'Post a Job',
  actionCallback: () => window.location.href = 'post-job.html'
});
```

### 4. Error State

Show when data loading fails:

```javascript
SiriusLoading.showErrorState('#jobsContainer', {
  title: 'Failed to load jobs',
  message: 'Something went wrong. Please try again.',
  actionText: 'Retry',
  actionCallback: loadJobs
});
```

### 5. Button Loading State

Disable button and show loading state:

```javascript
const restoreButton = SiriusLoading.setButtonLoading('#submitBtn', 'Submitting...');

// Later, restore button
restoreButton();
```

### 6. Clear Loading State

```javascript
SiriusLoading.clearLoading('#jobsContainer');
```

## Complete Example

```javascript
async function loadJobs() {
  const container = document.getElementById('jobsContainer');

  // Show skeleton while loading
  SiriusLoading.showSkeleton(container, 'card', 3);

  try {
    const response = await fetch('/api/jobs');
    const jobs = await response.json();

    if (jobs.length === 0) {
      // Show empty state
      SiriusLoading.showEmptyState(container, {
        icon: 'briefcase',
        title: 'No jobs available',
        message: 'Check back later for new opportunities.'
      });
      return;
    }

    // Render jobs
    container.innerHTML = jobs.map(job => `
      <div class="job-card">
        <h3>${job.title}</h3>
        <p>${job.description}</p>
      </div>
    `).join('');

    SiriusLoading.clearLoading(container);

  } catch (error) {
    // Show error state
    SiriusLoading.showErrorState(container, {
      title: 'Failed to load jobs',
      message: error.message,
      actionCallback: loadJobs
    });
  }
}

// Load on page load
loadJobs();
```

## Integration with Existing Dashboards

### Worker Dashboard Example

```javascript
// Add to worker-dashboard.html
async function loadMyApplications() {
  SiriusLoading.showSkeleton('#applicationsContainer', 'list', 5);

  try {
    const apps = await fetchApplications();
    renderApplications(apps);
    SiriusLoading.clearLoading('#applicationsContainer');
  } catch (error) {
    SiriusLoading.showErrorState('#applicationsContainer', {
      actionCallback: loadMyApplications
    });
  }
}
```

### Employer Dashboard Example

```javascript
// Add to employer-dashboard.html
async function loadPostedJobs() {
  SiriusLoading.showSkeleton('#postedJobsContainer', 'card', 3);

  try {
    const jobs = await fetchJobs();

    if (jobs.length === 0) {
      SiriusLoading.showEmptyState('#postedJobsContainer', {
        icon: 'plus-circle',
        title: 'Post your first job',
        message: 'Start hiring by posting a job opening.',
        actionText: 'Post Job',
        actionCallback: () => window.location.href = 'post-job.html'
      });
      return;
    }

    renderJobs(jobs);
    SiriusLoading.clearLoading('#postedJobsContainer');
  } catch (error) {
    SiriusLoading.showErrorState('#postedJobsContainer', {
      actionCallback: loadPostedJobs
    });
  }
}
```

## Customization

### Custom Skeleton

```javascript
const customSkeleton = SiriusLoading.createSkeleton('card', 5);
document.getElementById('container').innerHTML = customSkeleton;
```

### Custom Icons

Uses Feather Icons. Available icons: `inbox`, `briefcase`, `alert-circle`, `plus-circle`, etc.

See all icons: https://feathericons.com/

## Benefits

- ✅ Consistent loading experience across all dashboards
- ✅ Reduces perceived loading time
- ✅ Better UX with skeleton loaders
- ✅ Graceful error handling
- ✅ Empty state guidance for users
- ✅ Reusable and maintainable
