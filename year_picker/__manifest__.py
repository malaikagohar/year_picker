{
    "name": "Year Picker",
    "author": "Malaika Gohar",
    "version": "18.0.1.0.0",
    "category": "",
    "sequence": -100,
    "summary": "",
    "description": """
        A custom Odoo field widget that allows users to select only YEAR instead of a full date.
    """,
    "website": "",
    "images": [],
    "depends": [
        "base",
        "web",  
    ],
    "data": [
    ],
    "assets": {
        "web.assets_backend": [
            "year_picker/static/src/js/**/*",
        ],
    },
    'images': ['static/description/banner.png'],
    "installable": True,
    "application": True,
    "auto_install": False,
    "qweb": [],
    # "license": "LGPL-3",
}
