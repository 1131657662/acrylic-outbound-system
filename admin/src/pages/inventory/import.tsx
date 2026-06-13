import { PageContainer } from '@ant-design/pro-components';
import { Alert, Button, Card, Descriptions, Table, Upload, message } from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import { useState } from 'react';
import { importSku } from '../../services/inventory';
import type { ImportSkuResponse } from '../../services/types';

export default function InventoryImportPage() {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportSkuResponse | null>(null);

  async function handleImport(): Promise<void> {
    if (!selectedFile) {
      message.warning('请先选择 sku.txt 文件');
      return;
    }
    try {
      const content = await readSkuText(selectedFile);
      setResult(await importSku(content, selectedFile.name));
      message.success('SKU 导入完成');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '导入失败');
    }
  }

  return (
    <PageContainer title="SKU 导入">
      <Card>
        <Alert message="请选择 .txt 文件，格式：型号 + Tab + 条码 + Tab + 重量，每行一卷。" type="info" showIcon style={{ marginBottom: 16 }} />
        <Upload {...uploadProps(fileList, setFileList, setSelectedFile)}>
          <Button>选择 .txt 文件</Button>
        </Upload>
        <Button type="primary" onClick={handleImport} disabled={!selectedFile} style={{ marginTop: 16 }}>
          导入 SKU
        </Button>
      </Card>
      {result ? <ImportResult result={result} /> : null}
    </PageContainer>
  );
}

async function readSkuText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  return new TextDecoder('gb18030').decode(buffer);
}

function uploadProps(
  fileList: UploadFile[],
  setFileList: (files: UploadFile[]) => void,
  setSelectedFile: (file: File | null) => void,
): UploadProps {
  return {
    accept: '.txt',
    maxCount: 1,
    fileList,
    beforeUpload: file => {
      if (!file.name.toLowerCase().endsWith('.txt')) {
        message.error('只能导入 .txt 文件');
        return Upload.LIST_IGNORE;
      }
      setSelectedFile(file);
      setFileList([{ uid: file.uid, name: file.name, status: 'done' }]);
      return false;
    },
    onRemove: () => {
      setSelectedFile(null);
      setFileList([]);
    },
  };
}

function ImportResult({ result }: { result: ImportSkuResponse }) {
  return (
    <Card title="导入结果" style={{ marginTop: 16 }}>
      <Descriptions column={4}>
        <Descriptions.Item label="总行数">{result.totalCount}</Descriptions.Item>
        <Descriptions.Item label="成功">{result.successCount}</Descriptions.Item>
        <Descriptions.Item label="已出库跳过">{result.skippedCount}</Descriptions.Item>
        <Descriptions.Item label="格式错误">{result.errorCount}</Descriptions.Item>
      </Descriptions>
      <ImportWarnings result={result} />
    </Card>
  );
}

function ImportWarnings({ result }: { result: ImportSkuResponse }) {
  if (!result.skippedRollCodes.length && !result.errors.length) return null;
  return (
    <>
      <Alert
        type="warning"
        showIcon
        style={{ marginTop: 16 }}
        message="存在未导入明细，请核对后再继续出库"
      />
      {result.skippedRollCodes.length ? <SkippedTable rollCodes={result.skippedRollCodes} /> : null}
      {result.errors.length ? <ErrorTable errors={result.errors} /> : null}
    </>
  );
}

function SkippedTable({ rollCodes }: { rollCodes: string[] }) {
  return (
    <Table
      size="small"
      rowKey="rollCode"
      style={{ marginTop: 12 }}
      pagination={{ pageSize: 10 }}
      columns={[{ title: '已出库跳过卷号', dataIndex: 'rollCode' }]}
      dataSource={rollCodes.map(rollCode => ({ rollCode }))}
    />
  );
}

function ErrorTable({ errors }: { errors: ImportSkuResponse['errors'] }) {
  return (
    <Table
      size="small"
      rowKey="line"
      style={{ marginTop: 12 }}
      pagination={{ pageSize: 10 }}
      columns={[{ title: '行号', dataIndex: 'line', width: 100 }, { title: '错误原因', dataIndex: 'reason' }]}
      dataSource={errors}
    />
  );
}
