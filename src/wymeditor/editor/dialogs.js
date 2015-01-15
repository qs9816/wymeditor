"use strict";
/**
    editor.dialog
    =============

    Open a dialog box
*/
WYMeditor.editor.prototype.dialog = function (
    dialogName,
    pDialogWindowFeatures,
    pBodyHtml
) {
    var wym = this,
        i,
        DIALOGS = WYMeditor.DIALOGS,
        dialog,
        dialogWindowFeatures,
        wDialog,
        htmlStrReplacements,
        dialogHtml,
        doc,
        selectedContainer,
        options = wym._options;

    if (
        DIALOGS.hasOwnProperty(dialogName) !== true &&
        typeof pBodyHtml !== "string"
    ) {
        throw "No such dialog and no body HTML provided";
    }

    dialog = DIALOGS[dialogName];

    // Return `false` early if this dialog should not open. Use the dialog's
    // own function to check this.
    if (
        dialog &&
        dialog.shouldOpen.call(wym) !== true
    ) {
        return false;
    }

    if (pDialogWindowFeatures) {
        // Provided argument
        dialogWindowFeatures = pDialogWindowFeatures;
    } else if (dialog && dialog.getWindowFeatures) {
        // Dialog's code
        dialogWindowFeatures = dialog.getWindowFeatures.call(wym);
    } else if (options.dialogFeatures) {
        // Provided option
        dialogWindowFeatures = options.dialogFeatures;
    } else {
        // Default
        dialogWindowFeatures = [
            "menubar=no",
            "titlebar=no",
            "toolbar=no",
            "resizable=no",
            "width=560",
            "height=300",
            "top=0",
            "left=0"
        ].join(",");
    }

    wDialog = window.open(
        '',
        "wymDialogWindow",
        dialogWindowFeatures
    );

    if (
        typeof wDialog !== "object" ||
        wDialog.window !== wDialog
    ) {
        WYMeditor.console.warn("Could not create a dialog window");
        return false;
    }

    // In the case where a dialog window already exists, it will be reused.
    // If it is in the background, behind another window, without the following
    // `focus` call, it will remain in the background and the user may not
    // understand where it is. This `focus` call brings the dialog to the
    // foreground, making reasonably sure the user notices it.
    wDialog.focus();

    // Construct the dialog
    dialogHtml = options.dialogHtml || String() +
        '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" ' +
                '"http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">' +
        '<html dir="' + WYMeditor.DIRECTION + '">' +
            '<head>' +
                '<title>' + WYMeditor.DIALOG_TITLE + '</title>' +
            '</head>' +
            WYMeditor.DIALOG_BODY +
        '</html>';

    // HTML template replacements
    htmlStrReplacements = [
        {
            placeholder: WYMeditor.DIRECTION,
            replacement: options.direction
        },
        {
            placeholder: WYMeditor.DIALOG_TITLE,
            replacement: dialog ? wym._encloseString(dialog.title) : "Dialog"
        },
        {
            placeholder: WYMeditor.DIALOG_BODY,
            replacement: pBodyHtml || dialog.getBodyHtml.call(wym)
        }
    ];

    // Perform HTML template replacements
    for (i = 0; i < htmlStrReplacements.length; i++) {
        dialogHtml = WYMeditor.Helper.replaceAllInStr(
            dialogHtml,
            htmlStrReplacements[i].placeholder,
            htmlStrReplacements[i].replacement
        );
    }

    dialogHtml = wym.replaceStrings(dialogHtml);

    doc = wDialog.document;
    doc.write(dialogHtml);
    if (dialog && dialog.getBodyClass) {
        jQuery(doc.body).addClass(dialog.getBodyClass.call(wym));
    }
    doc.close();

    selectedContainer = wym.selectedContainer();

    wDialog.onbeforeunload = function () {
        wym.focusOnDocument();
    };

    // pre-init functions
    if (jQuery.isFunction(options.preInitDialog)) {
        options.preInitDialog(wym, wDialog);
    }

    // auto populate fields if selected container (e.g. A)
    if (selectedContainer) {
        jQuery(options.hrefSelector, doc).val(jQuery(selectedContainer)
            .attr(WYMeditor.HREF));
        jQuery(options.srcSelector, doc).val(jQuery(selectedContainer)
            .attr(WYMeditor.SRC));
        jQuery(options.titleSelector, doc).val(jQuery(selectedContainer)
            .attr(WYMeditor.TITLE));
        jQuery(options.relSelector, doc).val(jQuery(selectedContainer)
            .attr(WYMeditor.REL));
        jQuery(options.altSelector, doc).val(jQuery(selectedContainer)
            .attr(WYMeditor.ALT));
    }

    if (dialog && dialog.submitHandler) {
        jQuery("form", doc).submit(function () {
            dialog.submitHandler.call(wym, wDialog);
        });
    }

    //cancel button
    jQuery(options.cancelSelector, doc).click(function () {
        wDialog.close();
    });

    //pre-init functions
    if (jQuery.isFunction(options.postInitDialog)) {
        options.postInitDialog(wym, wDialog);
    }

    return wDialog;
};

/*
 * An object of default dialogs.
 *
 * Each has the following properties:
 * String `title`
 *     Dialog window title.
 * Function `shouldOpen`
 *     Its return value determines whether the dialog should be opened or not.
 *     Is called with the editor as `this`.
 * Function `getBodyHtml`
 *     Used to provide the dialog's body's HTML. Is called with the editor as
 *     `this`.
 * Function `getBodyClass`
 *     Optional. Returns a class that will be added to the body of the dialog
 *     window's document.
 * Function `getWindowFeatures`
 *     Optional. Used to provide the dialog's window features, for passing to
 *     `window.open`. Is called with the editor as `this`.
 * function `SubmitHandler`
 *     Optional. Handles a submit button press in the dialog. Is called with
 *     the editor instance as `this`. Receives a single argument-the dialog
 *     window.
 */
WYMeditor.DIALOGS = {
    CreateLink: {
        title: "Link",
        shouldOpen: function () {
            var wym = this,
                selectedContainer;
            if (wym.hasSelection() !== true) {
                return false;
            }
            selectedContainer = wym.selectedContainer();
            if (selectedContainer === false) {
                return false;
            }
            if (
                wym.selection().isCollapsed &&
                selectedContainer.tagName.toLowerCase() !== "a"
            ) {
                return false;
            }
            return true;
        },
        getBodyHtml: function () {
            var wym = this;
            return wym._options.dialogLinkHtml || String() +
                '<form>' +
                    '<fieldset>' +
                        '<input type="hidden" class="wym_dialog_type" ' +
                            'value="' + WYMeditor.DIALOG_LINK + '" />' +
                        '<legend>{Link}</legend>' +
                        '<div class="row">' +
                            '<label>{URL}</label>' +
                            '<input type="text" class="wym_href" ' +
                                'value="" size="40" ' +
                                'autofocus="autofocus" />' +
                        '</div>' +
                        '<div class="row">' +
                            '<label>{Title}</label>' +
                            '<input type="text" class="wym_title" ' +
                                'value="" size="40" />' +
                        '</div>' +
                        '<div class="row">' +
                            '<label>{Relationship}</label>' +
                            '<input type="text" class="wym_rel" ' +
                                'value="" size="40" />' +
                        '</div>' +
                        '<div class="row row-indent">' +
                            '<input class="wym_submit" type="submit" ' +
                                'value="{Submit}" />' +
                            '<input class="wym_cancel" type="button" ' +
                                'value="{Cancel}" />' +
                        '</div>' +
                    '</fieldset>' +
                '</form>';
        },
        getBodyClass: function () {
            var wym = this;
            return wym._options.dialogSelectorLink || "wym_dialog_link";
        },
        submitHandler: function (wDialog) {
            var wym = this,
                options = wym._options,
                href = jQuery(options.hrefSelector, wDialog.document).val(),
                title = jQuery(options.titleSelector, wDialog.document).val(),
                rel = jQuery(options.relSelector, wDialog.document).val();

            wym.link({
                href: href,
                title: title,
                rel: rel
            });
            wDialog.close();
        }
    },
    InsertImage: {
        title: "Image",
        shouldOpen: function () {
            var wym = this;
            if (
                wym.hasSelection() !== true ||
                wym.selection().isCollapsed !== true
            ) {
                return false;
            }
            return true;
        },
        getBodyHtml: function () {
            var wym = this;
            return wym._options.dialogImageHtml || String() +
                '<form>' +
                    '<fieldset>' +
                        '<input type="hidden" class="wym_dialog_type" ' +
                            'value="' + WYMeditor.DIALOG_IMAGE + '" />' +
                        '<legend>{Image}</legend>' +
                        '<div class="row">' +
                            '<label>{URL}</label>' +
                            '<input type="text" class="wym_src" ' +
                                'value="" size="40" ' +
                                'autofocus="autofocus" />' +
                        '</div>' +
                        '<div class="row">' +
                            '<label>{Alternative_Text}</label>' +
                            '<input type="text" class="wym_alt" ' +
                                'value="" size="40" />' +
                        '</div>' +
                        '<div class="row">' +
                            '<label>{Title}</label>' +
                            '<input type="text" class="wym_title" ' +
                                'value="" size="40" />' +
                        '</div>' +
                        '<div class="row row-indent">' +
                            '<input class="wym_submit" type="submit" ' +
                                'value="{Submit}" />' +
                            '<input class="wym_cancel" type="button" ' +
                                'value="{Cancel}" />' +
                        '</div>' +
                    '</fieldset>' +
                '</form>';
        },
        getBodyClass: function () {
            var wym = this;
            return wym._options.dialogImageSelector || "wym_dialog_image";
        },
        submitHandler: function (wDialog) {
            var wym = this,
                options = wym._options,
                imgAttrs;

            imgAttrs = {
                src: jQuery(options.srcSelector, wDialog.document).val(),
                title: jQuery(options.titleSelector, wDialog.document).val(),
                alt: jQuery(options.altSelector, wDialog.document).val()
            };

            wym.focusOnDocument();
            wym.insertImage(imgAttrs);
            wDialog.close();
        }
    },
    InsertTable: {
        title: "Table",
        shouldOpen: function () {
            var wym = this;
            if (
                wym.hasSelection() !== true ||
                wym.selection().isCollapsed !== true
            ) {
                return false;
            }
            return true;
        },
        getBodyHtml: function () {
            var wym = this;
            return wym._options.dialogTableHtml || String() +
                '<form>' +
                    '<fieldset>' +
                        '<input type="hidden" class="wym_dialog_type" ' +
                            'value="' + WYMeditor.DIALOG_TABLE + '" />' +
                        '<legend>{Table}</legend>' +
                        '<div class="row">' +
                            '<label>{Caption}</label>' +
                            '<input type="text" class="wym_caption" ' +
                                'value="" size="40" />' +
                        '</div>' +
                        '<div class="row">' +
                            '<label>{Summary}</label>' +
                            '<input type="text" class="wym_summary" ' +
                                'value="" size="40" />' +
                        '</div>' +
                        '<div class="row">' +
                            '<label>{Number_Of_Rows}</label>' +
                            '<input type="text" class="wym_rows" ' +
                                'value="3" size="3" />' +
                        '</div>' +
                        '<div class="row">' +
                            '<label>{Number_Of_Cols}</label>' +
                            '<input type="text" class="wym_cols" ' +
                                'value="2" size="3" />' +
                        '</div>' +
                        '<div class="row row-indent">' +
                            '<input class="wym_submit" type="submit" ' +
                                'value="{Submit}" />' +
                            '<input class="wym_cancel" type="button" ' +
                                'value="{Cancel}" />' +
                        '</div>' +
                    '</fieldset>' +
                '</form>';
        },
        getBodyClass: function () {
            var wym = this;
            return wym._options.dialogTableSelector || "wym_dialog_table";
        },
        submitHandler: function (wDialog) {
            var wym = this,
                options = wym._options,
                doc = wDialog.document,
                numRows = jQuery(options.rowsSelector, doc).val(),
                numColumns = jQuery(options.colsSelector, doc).val(),
                caption = jQuery(options.captionSelector, doc).val(),
                summary = jQuery(options.summarySelector, doc).val();

            wym.insertTable(numRows, numColumns, caption, summary);
            wDialog.close();
        }
    },
    Paste: {
        title: "Paste_From_Word",
        shouldOpen: function () {
            var wym = this;
            if (
                wym.hasSelection() !== true ||
                wym.selection().isCollapsed !== true
            ) {
                return false;
            }
            return true;
        },
        getBodyHtml: function () {
            var wym = this;
            return wym._options.dialogPasteHtml || String() +
                '<form>' +
                    '<input type="hidden" class="wym_dialog_type" ' +
                        'value="' + WYMeditor.DIALOG_PASTE + '" />' +
                    '<fieldset>' +
                        '<legend>{Paste_From_Word}</legend>' +
                        '<div class="row">' +
                            '<textarea class="wym_text" rows="10" ' +
                                'cols="50" autofocus="autofocus">' +
                            '</textarea>' +
                        '</div>' +
                        '<div class="row">' +
                            '<input class="wym_submit" type="submit" ' +
                                'value="{Submit}" />' +
                            '<input class="wym_cancel" type="button" ' +
                                'value="{Cancel}" />' +
                        '</div>' +
                    '</fieldset>' +
                '</form>';
        },
        getBodyClass: function () {
            var wym = this;
            return wym._options.dialogPasteSelector || "wym_dialog_paste";
        },
        submitHandler: function (wDialog) {
            var wym = this,
                sText;
            sText = jQuery(wym._options.textSelector, wDialog.document).val();
            wym.paste(sText);
            wDialog.close();
        }
    },
    Preview: {
        title: "Preview",
        shouldOpen: function () {
            return true;
        },
        getBodyHtml: function () {
            var wym = this;
            return wym._options.dialogPreviewHtml || wym.html();
        },
        getWindowFeatures: function () {
            return [
                "menubar=no",
                "titlebar=no",
                "toolbar=no",
                "resizable=no",
                "width=560",
                "height=300",
                "top=0",
                "left=0",
                "scrollbars=yes"
            ].join(",");
        },
        getBodyClass: function () {
            var wym = this;
            return wym._options.dialogPreviewSelector || "wym_dialog_preview";
        }
    }
};

WYMeditor.DIALOG_TITLE = "{Wym_Dialog_Title}";
WYMeditor.DIALOG_BODY = "{Wym_Dialog_Body}";
WYMeditor.DIALOG_BUTTON_SELECTOR = ".wym_opens_dialog a";

WYMeditor.DEFAULT_DIALOG_OPTIONS = {
    hrefSelector: ".wym_href",
    srcSelector: ".wym_src",
    titleSelector: ".wym_title",
    relSelector: ".wym_rel",
    altSelector: ".wym_alt",
    textSelector: ".wym_text",
    rowsSelector: ".wym_rows",
    colsSelector: ".wym_cols",
    captionSelector: ".wym_caption",
    summarySelector: ".wym_summary",
    submitSelector: "form",
    cancelSelector: ".wym_cancel",
    previewSelector: "",
    dialogLinkSelector: ".wym_dialog_link",
    dialogImageSelector: ".wym_dialog_image",
    dialogTableSelector: ".wym_dialog_table",
    dialogPasteSelector: ".wym_dialog_paste",
    dialogPreviewSelector: ".wym_dialog_preview"
};
