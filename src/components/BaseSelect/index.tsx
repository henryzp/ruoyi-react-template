import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Select } from 'antd';
import type {
  BaseSelectMapping,
  BaseSelectOption,
  BaseSelectProps,
  BaseSelectRef,
} from './types';
import { makeRequest } from '@/request';
const queryData = makeRequest<unknown>({ url: '' });
const DEFAULT_MAPPING: BaseSelectMapping = { key: 'name', value: 'desc' };
const EMPTY_LIST: BaseSelectOption[] = [];
const BaseSelect = React.forwardRef<BaseSelectRef, BaseSelectProps>(
  (props, ref) => {
    const {
      mapping = DEFAULT_MAPPING,
      list = EMPTY_LIST,
      url,
      getUrl,
      combobox,
      getParams,
      needRequestDidMount = false,
      needOnFocus = true,
      needOnSearch = true,
      optionsRenderer,
      responseHandler,
      onRequestError,
      customRequest,
      extraParams,
      enableCopy,
      searchDebounce,
      onClear,
      onFocus,
      onOpenChange,
      optionLabelProp = 'children',
      allowClear = true,
      showSearch = true,
      filterOption = false,
      onSearch,
      ...rest
    } = props;
    const [options, setOptions] = useState<BaseSelectOption[]>(list);
    const [searchValue, setSearchValue] = useState<string>();
    const [comboValue, setComboValue] = useState<string>();
    const mounted = useRef(true);
    const requestId = useRef(0);
    const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
      undefined,
    );
    const focusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
      undefined,
    );
    const selectRef = useRef<BaseSelectRef | null>(null);
    const clearSearchTimer = useCallback(() => {
      if (searchTimer.current) {
        clearTimeout(searchTimer.current);
        searchTimer.current = undefined;
      }
    }, []);
    const fetchOptions = useCallback(
      async (value?: string) => {
        const id = ++requestId.current;
        const currentUrl = getUrl?.() ?? url;
        if (!currentUrl && !customRequest) {
          if (mounted.current) setOptions([]);
          return;
        }
        const params = getParams?.(value) ?? {
          searchValue: value?.trim() ?? '',
        };
        let result: { data?: unknown; err?: unknown };
        try {
          result = customRequest
            ? await customRequest({ ...params, ...extraParams })
            : await queryData({
                url: currentUrl,
                method: 'GET',
                params: { ...params, ...extraParams },
              });
        } catch (error) {
          if (mounted.current && id === requestId.current) {
            setOptions([]);
            onRequestError?.(error);
          }
          return;
        }
        if (!mounted.current || id !== requestId.current) return;
        if (result.err) {
          setOptions([]);
          onRequestError?.(result.err);
          return;
        }
        let next = (result.data as BaseSelectOption[] | null) ?? [];
        try {
          if (responseHandler) next = responseHandler(next);
        } catch (error) {
          setOptions([]);
          onRequestError?.(error);
          return;
        }
        if (mounted.current && id === requestId.current)
          setOptions(Array.isArray(next) ? next : []);
      },
      [
        customRequest,
        extraParams,
        getParams,
        getUrl,
        onRequestError,
        responseHandler,
        url,
      ],
    );
    useEffect(
      () => () => {
        mounted.current = false;
        requestId.current += 1;
        clearSearchTimer();
        if (focusTimer.current) clearTimeout(focusTimer.current);
      },
      [clearSearchTimer],
    );
    useEffect(() => clearSearchTimer, [clearSearchTimer, fetchOptions]);
    useEffect(() => {
      clearSearchTimer();
      requestId.current += 1;
      setOptions(list);
    }, [clearSearchTimer, list]);
    useEffect(() => {
      mounted.current = true;
      if (
        (needRequestDidMount || extraParams !== undefined) &&
        (url || getUrl || customRequest)
      )
        fetchOptions().catch(() => undefined);
    }, [
      customRequest,
      extraParams,
      fetchOptions,
      getUrl,
      needRequestDidMount,
      url,
    ]);
    const shown = [...options];
    if (
      combobox &&
      comboValue &&
      !shown.some((o) => o[mapping.value] === comboValue)
    )
      shown.unshift({ [mapping.key]: comboValue, [mapping.value]: comboValue });
    return (
      <Select
        {...rest}
        ref={(node) => {
          selectRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        allowClear={allowClear}
        showSearch={showSearch}
        filterOption={filterOption}
        searchValue={searchValue}
        optionLabelProp={optionLabelProp}
        onOpenChange={(open) => {
          if (open && enableCopy) {
            if (focusTimer.current) clearTimeout(focusTimer.current);
            focusTimer.current = setTimeout(() => {
              const value = rest.value;
              const found = shown.find(
                (option) => option[mapping.key] === value,
              );
              if (mounted.current) {
                setSearchValue(String(found?.[mapping.value] ?? value ?? ''));
                selectRef.current?.focus();
              }
            }, 100);
          } else {
            if (focusTimer.current) clearTimeout(focusTimer.current);
            setSearchValue(undefined);
          }
          onOpenChange?.(open);
        }}
        onFocus={(e) => {
          if (needOnFocus) fetchOptions().catch(() => undefined);
          onFocus?.(e);
        }}
        onClear={() => {
          if (url || getUrl || customRequest)
            fetchOptions().catch(() => undefined);
          onClear?.();
        }}
        onSearch={(value) => {
          if (enableCopy) setSearchValue(value);
          if (combobox) setComboValue(value);
          clearSearchTimer();
          if (needOnSearch) {
            if (searchDebounce)
              searchTimer.current = setTimeout(
                () => fetchOptions(value).catch(() => undefined),
                searchDebounce,
              );
            else fetchOptions(value).catch(() => undefined);
          }
          onSearch?.(value);
        }}
      >
        {optionsRenderer
          ? optionsRenderer(shown)
          : shown.map((option) => (
              <Select.Option
                key={String(option[mapping.__primaryKey ?? mapping.key])}
                value={option[mapping.key] as string | number}
                title={String(option[mapping.value] ?? '')}
                disabled={Boolean(option.disabled)}
              >
                {String(option[mapping.value] ?? '')}
              </Select.Option>
            ))}
      </Select>
    );
  },
);
BaseSelect.displayName = 'BaseSelect';
export { BaseSelect };
export default BaseSelect;
