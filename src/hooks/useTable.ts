import type {PaginationProps} from 'antd';
import { useEffect, useState } from 'react';

function getRemainList(allList: any[], subList: any[], key: string) {
  //1-遍历大数组
  const arr: any[] = [];
  allList.forEach((item) => {
    //2-起一个变量判断小数组中是否有大数组中的某一个元素，如果有则该值为true 如果没有 则该值为false
    let flag = false;
    //3-遍历小数组
    subList.forEach((item1) => {
      if (item1[key] === item[key]) {
        flag = true;
      }
    });
    if (flag === false) {
      arr.push(item);
    }
  });
  return arr;
}

/**
 * 检查是否是交互式元素或其父节点
 * 如果遇到<tr> 或 <td> 元素则停止递归
 * @param element 当前点击的元素
 */
const isInteractiveElement = (element: HTMLElement | null): boolean => {
  if (!element) return false;

  const tagName = element.tagName.toLowerCase();

  // 停止递归条件：遇到<tr>或<td>时，不再继续向上递归
  if (tagName === 'tr' || tagName === 'td') {
    return false;
  }

  // 判断是否是交互性元素
  if (
    tagName === 'button' ||
    tagName === 'a' ||
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    element.getAttribute('role') === 'button' ||
    element.getAttribute('data-stop-propagation') === 'true' || // 自定义属性
    element.classList.contains('no-row-click') // 特定的 CSS 类名
  ) {
    return true;
  }

  // 递归检查父元素，直到 <tr> 或 <td>
  return isInteractiveElement(element.parentElement);
};

interface TablePropsBase {
  handleFetchData: (args: { resetPageNo?: boolean }) => void;
  loading: boolean;
  dataSource: any[];
  pagination: PaginationProps;
  rowKey: string;
}

interface TablePropsWithSelection extends TablePropsBase {
  rowSelection: any;
  onRow: any;
  selectedRows: any[];
  resetSelectRowKeysFn: () => void;
}

interface TablePropsWithoutSelection extends TablePropsBase {
  rowSelection?: any;
  onRow?: any;
  selectedRows?: any[];
  resetSelectRowKeysFn?: () => void;
}

type MyTableProps<T> = T extends true
  ? TablePropsWithSelection
  : TablePropsWithoutSelection;

export default <T extends boolean = false>(props: {
  fetchData: (
    pagination: { pageNo: number; pageSize: number; total: number },
    resetPageNo?: boolean,
  ) => Promise<any>;
  hasRowSelection?: boolean;
  resetSelectRowKeys?: boolean;
  defaultSelectedRows?: any[];
  rowKey?: string;
  hasFetchAuth?: boolean;
  defaultPagination?: {
    pageSize?: number;
    pageNo?: number;
  };
  rowSelectionType?: 'checkbox' | 'radio';
  extraDependencies?: any[];
  defaultPageSizeOptions?: string[];
}): MyTableProps<T> => {
  const {
    fetchData,
    hasRowSelection = false,
    resetSelectRowKeys = true,
    defaultSelectedRows = [],
    rowKey = 'id',
    hasFetchAuth = true,
    defaultPagination = {
      pageSize: 10,
      pageNo: 1,
    },
    defaultPageSizeOptions = ['10', '20', '50', '100'],
    rowSelectionType = 'checkbox',
    extraDependencies = [],
  } = props;

  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState([]);
  const [pagination, setPagination] = useState({
    ...defaultPagination,
    total: 0,
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>(
    defaultSelectedRows.map((item) => item[rowKey]),
  );
  const [selectedRows, setSelectedRows] = useState<any[]>(defaultSelectedRows);

  const handleFetchData = async ({
    resetPageNo,
  }: {
    resetPageNo?: boolean;
  }) => {
    setLoading(true);
    if (hasRowSelection && resetSelectRowKeys) {
      setSelectedRowKeys([]);
      setSelectedRows([]);
    }
    // @ts-ignore
    const { err, data } = await fetchData(pagination, resetPageNo);
    if (!err) {
      setDataSource(data.records);
      setPagination({
        pageSize: data.size,
        pageNo: data.current,
        total: data.total,
      });
    }
    setLoading(false);
  };

  let rowSelection = undefined;
  let onRow = undefined;

  const onSelectRow = (record: any, event: React.MouseEvent) => {
    const target = event.target as HTMLElement;

    // 如果点击的是交互性元素或者其中的子元素，则阻止冒泡
    if (isInteractiveElement(target)) {
      return; // 不触发行点击事件
    }
    if (rowSelectionType === 'checkbox') {
      const isSelected = selectedRowKeys.includes(record[rowKey]);
      if (isSelected) {
        // 如果已经选中，则过滤掉
        setSelectedRowKeys(
          selectedRowKeys.filter((key) => key !== record[rowKey]),
        );
        setSelectedRows(
          selectedRows.filter((row) => row[rowKey] !== record[rowKey]),
        );
      } else {
        // 如果未选中，则添加进选中的行
        setSelectedRowKeys([...selectedRowKeys, record[rowKey]]);
        setSelectedRows([...selectedRows, record]);
      }
    } else {
      setSelectedRowKeys([record[rowKey]]);
      setSelectedRows([record]);
    }
  };

  if (hasRowSelection) {
    rowSelection = {
      type: rowSelectionType,
      fixed: true,
      selectedRowKeys,
      onSelect: (record: any, selected: boolean) => {
        if (rowSelectionType === 'checkbox') {
          if (selected) {
            setSelectedRowKeys([...selectedRowKeys, record[rowKey]]);
            setSelectedRows([...selectedRows, record]);
          } else {
            setSelectedRowKeys(
              selectedRowKeys.filter((item) => item !== record[rowKey]),
            );
            setSelectedRows(
              selectedRows.filter((item) => item[rowKey] !== record[rowKey]),
            );
          }
        } else {
          setSelectedRowKeys([record[rowKey]]);
          setSelectedRows([record]);
        }
      },
      onSelectAll: (
        selected: any,
        newSelectedRows: any[],
        changeRows: any[],
      ) => {
        if (selected) {
          const arr = [
            ...selectedRows,
            ...newSelectedRows.filter((item) => !!item),
          ];
          const uniqueArr = arr.filter(
            (item, index) =>
              arr.findIndex((i) => i[rowKey] === item[rowKey]) === index,
          );
          setSelectedRowKeys(uniqueArr.map((item) => item[rowKey]));
          setSelectedRows(uniqueArr);
        } else {
          const diffSelectedRows = changeRows.filter((item) => !!item);
          const arr = getRemainList(selectedRows, diffSelectedRows, rowKey);
          setSelectedRowKeys(arr.map((item) => item[rowKey]));
          setSelectedRows(arr);
        }
      },
    };
    onRow = (record: any) => ({
      onClick: (event: React.MouseEvent) => onSelectRow(record, event),
    });
  }

  useEffect(() => {
    if (hasFetchAuth) {
      handleFetchData({});
    }
  }, [pagination.pageNo, pagination.pageSize, ...extraDependencies]);

  const resetSelectRowKeysFn = () => {
    setSelectedRowKeys([]);
    setSelectedRows([]);
  };

  const commonResultProps: TablePropsBase = {
    loading,
    dataSource,
    pagination: {
      pageSize: pagination.pageSize,
      current: pagination.pageNo,
      total: pagination.total,
      showSizeChanger: true,
      showQuickJumper: true,
      pageSizeOptions: defaultPageSizeOptions,
      showTotal: (total) => `共 ${total} 条`,
      onChange: (page) => {
        setPagination({
          ...pagination,
          pageNo: page,
        });
      },
      onShowSizeChange: (current, size) => {
        setTimeout(() => {
          setPagination({
            ...pagination,
            pageNo: 1,
            pageSize: size,
          });
        }, 200);
      },
    },
    handleFetchData,
    rowKey,
  };

  if (hasRowSelection) {
    return {
      ...commonResultProps,
      selectedRows,
      rowSelection,
      onRow,
      resetSelectRowKeysFn,
    } as MyTableProps<T>;
  } else {
    return commonResultProps as MyTableProps<T>;
  }
};
