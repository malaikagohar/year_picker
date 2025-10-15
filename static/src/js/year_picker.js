/** @odoo-module **/

import { Component, onWillRender, useState } from "@odoo/owl";
import { useDateTimePicker } from "@web/core/datetime/datetime_hook";
import {
    areDatesEqual,
    deserializeDate,
    deserializeDateTime,
    formatDate,
    formatDateTime,
    today,
} from "@web/core/l10n/dates";
import { _t } from "@web/core/l10n/translation";
import { registry } from "@web/core/registry";
import { ensureArray } from "@web/core/utils/arrays";
import { exprToBoolean } from "@web/core/utils/strings";
import { standardFieldProps } from "@web/views/fields/standard_field_props";

export class YearDateField extends Component {
    static template = "web.DateTimeInput";

    static props = {
        ...standardFieldProps,
        maxDate: { type: String, optional: true },
        minDate: { type: String, optional: true },
        placeholder: { type: String, optional: true },
        required: { type: Boolean, optional: true },
        warnFuture: { type: Boolean, optional: true },
    };

    get field() {
        return this.props.record.fields[this.props.name];
    }

    get values() {
        return ensureArray(this.state.value);
    }

    get format() {
        return "yyyy";
    }

    //-------------------------------------------------------------------------
    // Lifecycle
    //-------------------------------------------------------------------------

    setup() {
        // 🔹 Helper to generate picker configuration
        const getPickerProps = () => {
            const value = this.getRecordValue();
            const pickerProps = {
                value,
                type: this.field.type,
                range: this.isRange(value),
                minPrecision: "years",
                ...(this.props.maxDate && { maxDate: this.parseLimitDate(this.props.maxDate) }),
                ...(this.props.minDate && { minDate: this.parseLimitDate(this.props.minDate) }),
            };
            return pickerProps;
        };

        // 🔹 Initialize picker hook
        const dateTimePicker = useDateTimePicker({
            format: this.format,
            target: "root",
            get pickerProps() {
                return getPickerProps();
            },
            onChange: () => {
                this.state.range = this.isRange(this.state.value);
            },
            onApply: () => this.applyDateChanges(),
        });

        this.state = useState(dateTimePicker.state);
        this.openPicker = dateTimePicker.open;
        this.onClickInput = () => this.openPicker();

        // 🔹 Recheck dirtiness before render
        onWillRender(() => this.triggerIsDirty());
    }

    //-------------------------------------------------------------------------
    // Methods
    //-------------------------------------------------------------------------

    /**
     * Updates field when user applies a date.
     */
    applyDateChanges() {
        const toUpdate = {};

        if (Array.isArray(this.state.value)) {
            [toUpdate[this.startDateField], toUpdate[this.endDateField]] = this.state.value;
        } else {
            toUpdate[this.props.name] = this.state.value;
        }

        // 🔹 Clean up unchanged values to avoid unnecessary writes
        for (const [fieldName, newValue] of Object.entries(toUpdate)) {
            if (areDatesEqual(newValue, this.props.record.data[fieldName])) {
                delete toUpdate[fieldName];
            }
        }

        if (Object.keys(toUpdate).length) {
            this.props.record.update(toUpdate);
        }
    }

    /**
     * @param {number} valueIndex
     */
    async addDate(valueIndex) {
        const values = [...this.values];
        values[valueIndex] = values[valueIndex ? 0 : 1];

        Object.assign(this.state, {
            focusedDateIndex: valueIndex,
            value: values,
            range: true,
        });

        this.openPicker(valueIndex);
    }

    /**
     * @param {number} valueIndex
     */
    getFormattedValue(valueIndex) {
        const value = this.values[valueIndex];
        if (!value) return "";
        return this.field.type === "date"
            ? formatDate(value, { format: this.format })
            : formatDateTime(value);
    }

    getRecordValue() {
        if (this.relatedField) {
            return [
                this.props.record.data[this.startDateField],
                this.props.record.data[this.endDateField],
            ];
        }
        return this.props.record.data[this.props.name];
    }

    isDateInTheFuture(index) {
        return this.values[index] > today();
    }

    isEmpty(fieldName) {
        return fieldName === this.startDateField ? !this.values[0] : !this.values[1];
    }

    isRange(value) {
        if (!this.relatedField) return false;
        const filledCount = ensureArray(value).filter(Boolean).length;
        return this.props.alwaysRange || this.props.required || filledCount === 2;
    }

    parseLimitDate(value) {
        if (value === "today") return value;
        return this.field.type === "date" ? deserializeDate(value) : deserializeDateTime(value);
    }

    shouldShowSeparator() {
        const { alwaysRange, readonly, required } = this.props;
        const showWhenReadonly = alwaysRange && !readonly && (!this.isEmpty(this.startDateField) || !this.isEmpty(this.endDateField));
        const showWhenRange = this.state.range && (required || (!this.isEmpty(this.startDateField) && !this.isEmpty(this.endDateField)));
        return showWhenReadonly || showWhenRange;
    }

    triggerIsDirty(isDirty) {
        const recordValue = this.getRecordValue();
        const stateValue = this.state.value;
        const dirty = isDirty ?? !areDatesEqual(recordValue, stateValue);
        this.props.record.model.bus.trigger("FIELD_IS_DIRTY", dirty);
    }

    onInput() {
        this.triggerIsDirty(true);
    }
}

//-------------------------------------------------------------------------
// Registry
//-------------------------------------------------------------------------

export const yearField = {
    component: YearDateField,
    displayName: _t("Year"),
    supportedOptions: [
        {
            label: _t("Earliest accepted date"),
            name: "min_date",
            type: "string",
            help: _t(`ISO-formatted date (e.g. "2018-12-31") or "%s".`, "today"),
        },
        {
            label: _t("Latest accepted date"),
            name: "max_date",
            type: "string",
            help: _t(`ISO-formatted date (e.g. "2018-12-31") or "%s".`, "today"),
        },
        {
            label: _t("Warning for future dates"),
            name: "warn_future",
            type: "boolean",
            help: _t("Displays a warning icon if the input dates are in the future."),
        },
    ],
    supportedTypes: ["date"],
    extractProps: ({ attrs, options }, dynamicInfo) => ({
        maxDate: options.max_date,
        minDate: options.min_date,
        placeholder: attrs.placeholder,
        required: dynamicInfo.required,
        warnFuture: exprToBoolean(options.warn_future),
    }),
};

registry.category("fields").add("year", yearField);
