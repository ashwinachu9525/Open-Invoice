"use client"

import { useState } from "react"
import { BankAccount } from "@prisma/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createBankAccount, deleteBankAccount, updateBankAccount } from "@/actions/bank-accounts"
import { Trash2, Plus, Building, CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface BankAccountsFormProps {
  initialAccounts: BankAccount[]
  isPro?: boolean
}

export function BankAccountsForm({ initialAccounts, isPro = false }: BankAccountsFormProps) {
  const [accounts, setAccounts] = useState<BankAccount[]>(initialAccounts)
  const isLimitReached = !isPro && accounts.length >= 2
  const [isAdding, setIsAdding] = useState(false)
  const [isPending, setIsPending] = useState(false)

  // Form State
  const [bankName, setBankName] = useState("")
  const [accountName, setAccountName] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [ifscCode, setIfscCode] = useState("")
  const [accountType, setAccountType] = useState("")
  const [isDefault, setIsDefault] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setIsPending(true)
    const result = await createBankAccount({
      bankName, accountName, accountNumber, ifscCode, accountType, isDefault
    })
    setIsPending(false)

    if (result.success && result.bankAccount) {
      if (result.bankAccount.isDefault) {
        setAccounts((prev) => prev.map(a => ({ ...a, isDefault: false })))
      }
      setAccounts((prev) => [result.bankAccount!, ...prev])
      setIsAdding(false)
      // Reset form
      setBankName(""); setAccountName(""); setAccountNumber(""); setIfscCode(""); setAccountType(""); setIsDefault(false);
      toast.success("Bank account added")
    } else {
      toast.error(result.error)
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteBankAccount(id)
    if (result.success) {
      setAccounts((prev) => prev.filter(a => a.id !== id))
      toast.success("Bank account deleted successfully")
    } else {
      toast.error(result.error || "Failed to delete bank account")
    }
  }

  async function handleSetDefault(id: string) {
    const account = accounts.find(a => a.id === id)
    if (!account) return
    
    // Optimistic update
    setAccounts((prev) => prev.map(a => ({ ...a, isDefault: a.id === id })))
    
    await updateBankAccount(id, {
      bankName: account.bankName,
      accountName: account.accountName,
      accountNumber: account.accountNumber,
      ifscCode: account.ifscCode,
      accountType: account.accountType,
      isDefault: true
    })
  }

  return (
    <div className="space-y-6">
      {isLimitReached && (
        <div className="p-3.5 rounded-xl border border-amber-500/10 bg-amber-500/5 text-xs text-slate-300">
          <p className="font-semibold text-amber-300 mb-1 flex items-center gap-1.5">
            ⚠️ Free Account Limit
          </p>
          You have reached the limit of <span className="text-amber-300 font-bold">2 bank accounts</span>. 
          Upgrade to Pro to add unlimited bank accounts.
        </div>
      )}

      {accounts.length === 0 && !isAdding ? (
        <div className="text-center py-8 glass glass-card border-white/10 rounded-xl">
          <Building className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">No bank accounts added yet.</p>
          <Button 
            onClick={() => setIsAdding(true)} 
            variant="outline" 
            className="mt-4 glass border-white/10"
            disabled={isLimitReached}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Bank Account
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Saved Accounts</h3>
            {!isAdding && (
              <Button 
                onClick={() => setIsAdding(true)} 
                size="sm" 
                variant="outline" 
                className="glass border-white/10"
                disabled={isLimitReached}
              >
                <Plus className="h-4 w-4 mr-1" /> Add New
              </Button>
            )}
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            {accounts.map(account => (
              <div key={account.id} className={`glass border p-4 rounded-xl relative group transition-all ${account.isDefault ? 'border-primary bg-primary/5' : 'border-white/10 hover:border-white/20'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="font-medium text-foreground">{account.bankName}</div>
                  {account.isDefault ? (
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-primary bg-primary/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Default
                    </span>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleSetDefault(account.id)}
                      className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 h-6 text-xs transition-opacity"
                    >
                      Set Default
                    </Button>
                  )}
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><span className="opacity-70">Name:</span> {account.accountName}</p>
                  <p><span className="opacity-70">A/C No:</span> {account.accountNumber}</p>
                  <p><span className="opacity-70">IFSC:</span> {account.ifscCode}</p>
                  {account.accountType && <p><span className="opacity-70">Type:</span> {account.accountType}</p>}
                </div>
                <AlertDialog>
                  <AlertDialogTrigger render={
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute bottom-2 right-2 h-8 w-8 text-red-400 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-red-400/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  } />
                  <AlertDialogContent className="bg-slate-900 border-slate-800 text-slate-100">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-slate-100 font-semibold">Delete Bank Account?</AlertDialogTitle>
                      <AlertDialogDescription className="text-slate-400">
                        Are you sure you want to delete this bank account? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex gap-2 justify-end">
                      <AlertDialogCancel className="border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(account.id)}
                        className="bg-rose-600 hover:bg-rose-700 text-slate-100"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleAdd} className="glass glass-card border-white/10 p-5 rounded-xl space-y-4 mt-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-foreground">Add New Bank Account</h3>
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAdding(false)}>Cancel</Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Bank Name *</Label>
              <Input required value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. State Bank of India" className="glass border-white/10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Account Name *</Label>
              <Input required value={accountName} onChange={e => setAccountName(e.target.value)} placeholder="Account holder name" className="glass border-white/10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Account Number *</Label>
              <Input required value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="e.g. 1234567890" className="glass border-white/10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">IFSC Code *</Label>
              <Input required value={ifscCode} onChange={e => setIfscCode(e.target.value)} placeholder="e.g. SBIN0000001" className="glass border-white/10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Account Type</Label>
              <Input value={accountType} onChange={e => setAccountType(e.target.value)} placeholder="e.g. Current or Savings" className="glass border-white/10" />
            </div>
            <div className="space-y-1.5 flex items-center h-full pt-6">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} className="rounded border-white/10 bg-black/20" />
                Set as default for new invoices
              </label>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={isPending} className="bg-primary text-primary-foreground">
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Bank Account
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
