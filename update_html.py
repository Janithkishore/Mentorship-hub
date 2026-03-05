import os, glob, re

# Map simple dashboard strings to Phosphor icons
nav_icons = {
    'Dashboard': '<i class="ph ph-squares-four"></i>',
    'Student Performance': '<i class="ph ph-student"></i>',
    'Mentor Performance': '<i class="ph ph-chalkboard-teacher"></i>',
    'Feedback Management': '<i class="ph ph-chat-teardrop-dots"></i>',
    'Assignments': '<i class="ph ph-exam"></i>',
    'Questions': '<i class="ph ph-question"></i>',
    'Reports': '<i class="ph ph-chart-bar"></i>',
    'Logout': '<i class="ph ph-sign-out"></i>',
    'My Feedback': '<i class="ph ph-chat-centered-text"></i>',
    'History': '<i class="ph ph-clock-counter-clockwise"></i>',
    'Provide Feedback': '<i class="ph ph-pencil-simple"></i>'
}

html_files = glob.glob('public/**/*.html', recursive=True)

for file_path in html_files:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Inject Phosphor Icons to <head> if not exists
    if 'phosphor-icons' not in content:
        content = content.replace('</head>', '    <script src="https://unpkg.com/@phosphor-icons/web"></script>\n</head>')
    
    # Apply Outfit font instead of Inter
    if 'family=Inter' in content:
        content = re.sub(r'family=Inter:[^"]*', 'family=Outfit:wght@300;400;500;600;700', content)

    # Restyle stats grid elements to fit new structure using .stat-icon
    if 'stat-card' in content and 'stat-icon' not in content:
        content = re.sub(
            r'<div class="value" id="([^"]+)">([^<]+)</div>\s*<div class="label">([^<]+)</div>',
            r'<div class="stat-icon"><i class="ph ph-chart-pie-slice"></i></div><div class="stat-info"><span class="stat-value" id="\1">\2</span><span class="stat-label">\3</span></div>',
            content
        )

    # Make sure auth page index has bg-blobs if it's not present
    if 'auth-page' in content and 'bg-blobs' not in content:
        blobs_html = '''<body>
    <div class="bg-blobs" aria-hidden="true">
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
        <div class="blob blob-3"></div>
    </div>'''
        content = content.replace('<body>', blobs_html)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

print("HTML files updated.")
