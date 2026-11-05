"use client";

import { useEffect } from "react";
import {
  Button,
  Checkbox,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
} from "antd";
import { DeleteOutlined, StopOutlined } from "@ant-design/icons";
import dayjs, { Dayjs } from "dayjs";
import type {
  BillType,
  CellularContractData,
  Contract,
  InternetContractData,
} from "@xpensive/types";
import { useContractsStore } from "@/store/contractsStore";
import { useResidencesStore } from "@/store/residencesStore";
import { useResidentsStore } from "@/store/residentsStore";
import { BILL_TYPE_OPTIONS } from "@/lib/billTypes";
import NumericInput from "@/components/shared/NumericInput";
import ProviderSelect from "@/components/providers/ProviderSelect";

interface Props {
  open: boolean;
  contract?: Contract | null;
  defaultType?: BillType;
  onClose: () => void;
}

interface FormValues {
  bill_type: BillType;
  provider_id: string;
  residence_id?: string | null;
  resident_id?: string | null;
  monthly_price: number;
  start_date: Dayjs;
  end_date?: Dayjs | null;
  comment?: string | null;
  // cellular
  data_gb?: number;
  calls_unlimited?: boolean;
  calls_minutes?: number;
  sms_unlimited?: boolean;
  sms_count?: number;
  // internet
  speed_mbps?: number;
}

export default function ContractModal({
  open,
  contract,
  defaultType,
  onClose,
}: Props) {
  const [form] = Form.useForm<FormValues>();
  const selectedType = Form.useWatch("bill_type", form);
  const callsUnlimited = Form.useWatch("calls_unlimited", form);
  const smsUnlimited = Form.useWatch("sms_unlimited", form);

  const isCellular = selectedType === "cellular";
  const isInternet = selectedType === "internet";
  const isEdit = !!contract;
  // A contract is still active when it has no end date, or its end date is today/future
  // (mirrors the isEnded logic used by ContractsTable).
  const isActive =
    isEdit &&
    !(contract!.end_date && dayjs(contract!.end_date).isBefore(dayjs(), "day"));

  const { createContract, updateContract, deleteContract } =
    useContractsStore();
  const { residences, fetchAll: fetchResidences } = useResidencesStore();
  const { residents, fetchAll: fetchResidents } = useResidentsStore();

  useEffect(() => {
    if (!open) return;
    fetchResidences();
    fetchResidents();

    if (contract) {
      const d = contract.data as Partial<
        CellularContractData & InternetContractData
      >;
      form.setFieldsValue({
        bill_type: contract.bill_type,
        provider_id: contract.provider_id,
        residence_id: contract.residence_id,
        resident_id: contract.resident_id,
        monthly_price: contract.monthly_price,
        start_date: dayjs(contract.start_date),
        end_date: contract.end_date ? dayjs(contract.end_date) : null,
        comment: contract.comment,
        data_gb: d.data_gb,
        calls_unlimited: d.calls_unlimited,
        calls_minutes: d.calls_minutes,
        sms_unlimited: d.sms_unlimited,
        sms_count: d.sms_count,
        speed_mbps: d.speed_mbps,
      });
    } else {
      form.resetFields();
      if (defaultType) form.setFieldValue("bill_type", defaultType);
    }
  }, [open, contract]);

  const handleOk = async () => {
    const values = await form.validateFields();

    let data: Record<string, unknown> = {};
    if (isCellular) {
      data = {
        data_gb: values.data_gb,
        calls_unlimited: values.calls_unlimited ?? false,
        calls_minutes: values.calls_unlimited
          ? undefined
          : values.calls_minutes,
        sms_unlimited: values.sms_unlimited ?? false,
        sms_count: values.sms_unlimited ? undefined : values.sms_count,
      };
    } else if (isInternet) {
      data = { speed_mbps: values.speed_mbps };
    }

    const payload = {
      bill_type: values.bill_type,
      provider_id: values.provider_id,
      residence_id: values.residence_id ?? null,
      resident_id: values.resident_id ?? null,
      monthly_price: values.monthly_price,
      start_date: values.start_date.format("YYYY-MM-DD"),
      end_date: values.end_date ? values.end_date.format("YYYY-MM-DD") : null,
      comment: values.comment ?? null,
      data,
    };

    if (isEdit) {
      await updateContract(contract.id, payload);
    } else {
      await createContract(payload);
    }
    onClose();
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  const handleDelete = async () => {
    await deleteContract(contract!.id);
    onClose();
  };

  const handleEnd = async () => {
    await updateContract(contract!.id, {
      end_date: dayjs().format("YYYY-MM-DD"),
    });
    onClose();
  };

  return (
    <Modal
      title={isEdit ? "Edit Contract" : "New Contract"}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      okText="Save"
      destroyOnHidden
      footer={(_, { OkBtn, CancelBtn }) => (
        <div
          style={{
            display: "flex",
            width: "100%",
            justifyContent: isEdit ? "space-between" : "flex-end",
          }}
        >
          {isEdit && (
            <div style={{ display: "flex", gap: 8 }}>
              <Popconfirm
                title="Delete Contract"
                description="Are you sure you want to delete this contract? This action cannot be undone."
                okText="Delete"
                okButtonProps={{ danger: true }}
                onConfirm={handleDelete}
              >
                <Button danger icon={<DeleteOutlined />}>
                  Delete
                </Button>
              </Popconfirm>
              {isActive && (
                <Popconfirm
                  title="End Contract"
                  description="End this contract as of today? Its end date will be set to the current date."
                  okText="End"
                  onConfirm={handleEnd}
                >
                  <Button icon={<StopOutlined />}>End</Button>
                </Popconfirm>
              )}
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <CancelBtn />
            <OkBtn />
          </div>
        </div>
      )}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="bill_type"
          label="Type"
          rules={[{ required: true, message: "Required" }]}
        >
          <Select options={BILL_TYPE_OPTIONS} />
        </Form.Item>

        <Form.Item
          name="provider_id"
          label="Provider"
          rules={[{ required: true, message: "Required" }]}
        >
          <ProviderSelect
            billType={selectedType as BillType}
            placeholder="Select provider"
          />
        </Form.Item>

        <Form.Item name="residence_id" label="Residence">
          <Select
            allowClear
            placeholder="None"
            options={residences.map((r) => ({
              value: r.id,
              label: `${r.street}, ${r.city}`,
            }))}
          />
        </Form.Item>

        <Form.Item name="resident_id" label="Resident">
          <Select
            allowClear
            placeholder="None"
            options={residents.map((r) => ({ value: r.id, label: r.name }))}
          />
        </Form.Item>

        <Form.Item
          name="monthly_price"
          label="Monthly Price"
          rules={[{ required: true, message: "Required" }]}
        >
          <NumericInput
            min={0}
            precision={2}
            prefix="₪"
            style={{ width: "100%" }}
          />
        </Form.Item>

        <div style={{ display: "flex", gap: 24 }}>
          <Form.Item
            name="start_date"
            label="Start Date"
            rules={[{ required: true, message: "Required" }]}
            style={{ flex: 1 }}
          >
            <DatePicker format="DD/MM/YY" style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="end_date" label="End Date" style={{ flex: 1 }}>
            <DatePicker format="DD/MM/YY" style={{ width: "100%" }} />
          </Form.Item>
        </div>

        {isCellular && (
          <>
            <Form.Item
              name="data_gb"
              label="Data (GB)"
              rules={[{ required: true, message: "Required" }]}
            >
              <InputNumber
                min={0}
                precision={0}
                style={{ width: "100%" }}
                placeholder="e.g. 500"
              />
            </Form.Item>

            <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
              <Form.Item
                name="calls_unlimited"
                valuePropName="checked"
                style={{ flex: 1, marginBottom: 0 }}
              >
                <Checkbox>Unlimited Calls</Checkbox>
              </Form.Item>
              {!callsUnlimited && (
                <Form.Item
                  name="calls_minutes"
                  label="Call Minutes"
                  rules={[{ required: true, message: "Required" }]}
                  style={{ flex: 1 }}
                >
                  <InputNumber
                    min={0}
                    precision={0}
                    style={{ width: "100%" }}
                    placeholder="minutes"
                  />
                </Form.Item>
              )}
            </div>

            <div
              style={{
                display: "flex",
                gap: 24,
                alignItems: "flex-start",
                marginTop: 8,
              }}
            >
              <Form.Item
                name="sms_unlimited"
                valuePropName="checked"
                style={{ flex: 1, marginBottom: 0 }}
              >
                <Checkbox>Unlimited SMS</Checkbox>
              </Form.Item>
              {!smsUnlimited && (
                <Form.Item
                  name="sms_count"
                  label="SMS Count"
                  rules={[{ required: true, message: "Required" }]}
                  style={{ flex: 1 }}
                >
                  <InputNumber
                    min={0}
                    precision={0}
                    style={{ width: "100%" }}
                    placeholder="messages"
                  />
                </Form.Item>
              )}
            </div>
          </>
        )}

        {isInternet && (
          <Form.Item
            name="speed_mbps"
            label="Speed (Mbps)"
            rules={[{ required: true, message: "Required" }]}
          >
            <InputNumber
              min={0}
              precision={0}
              style={{ width: "100%" }}
              placeholder="e.g. 1000"
            />
          </Form.Item>
        )}

        <Form.Item name="comment" label="Comment" style={{ marginTop: 8 }}>
          <Input.TextArea
            maxLength={200}
            showCount
            autoSize={{ minRows: 2, maxRows: 4 }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
